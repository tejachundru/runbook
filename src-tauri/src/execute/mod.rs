use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::OnceLock;
use std::thread;
use std::time::{Duration, Instant};
use wait_timeout::ChildExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteResult {
    pub stdout: String,
    pub stderr: String,
    #[serde(rename = "exitCode")]
    pub exit_code: i32,
}

// ---------------------------------------------------------------------------
// PATH resolution
// ---------------------------------------------------------------------------

fn login_shell_path() -> String {
    let mut base = {
        let result = Command::new("sh")
            .args(["-l", "-c", "echo $PATH"])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output();

        match result {
            Ok(out) => {
                let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !p.is_empty() {
                    p
                } else {
                    default_path_dirs()
                }
            }
            Err(_) => default_path_dirs(),
        }
    };

    // Append well-known runtime-specific dirs that installers add to ~/.bashrc
    // but not always to the login profile (common on Linux).
    if let Some(home) = std::env::var_os("HOME") {
        let home = PathBuf::from(home);
        for suffix in &[".cargo/bin", ".bun/bin", "go/bin", ".local/bin"] {
            let p = home.join(suffix);
            if p.exists() {
                base.push(':');
                base.push_str(&p.to_string_lossy());
            }
        }
    }

    base
}

fn default_path_dirs() -> String {
    [
        "/usr/local/bin",
        "/usr/bin",
        "/bin",
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/home/linuxbrew/.linuxbrew/bin",
    ]
    .join(":")
}

fn resolve_binary(name: &str) -> Option<PathBuf> {
    let path_env = login_shell_path();

    let out = Command::new("which")
        .arg(name)
        .env("PATH", &path_env)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if out.status.success() {
        let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !s.is_empty() {
            return Some(PathBuf::from(s));
        }
    }

    // Walk PATH manually as a fallback
    for dir in path_env.split(':') {
        let candidate = PathBuf::from(dir).join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }

    None
}

fn resolve_any(candidates: &[&str]) -> Option<PathBuf> {
    for name in candidates {
        if let Some(path) = resolve_binary(name) {
            return Some(path);
        }
    }
    None
}

// ---------------------------------------------------------------------------
// Per-runtime OnceLocks
// ---------------------------------------------------------------------------

fn js_runtime() -> Option<&'static PathBuf> {
    static JS: OnceLock<Option<PathBuf>> = OnceLock::new();
    JS.get_or_init(|| resolve_any(&["bun", "node", "nodejs"])).as_ref()
}

fn ts_runtime() -> Option<&'static PathBuf> {
    static TS: OnceLock<Option<PathBuf>> = OnceLock::new();
    TS.get_or_init(|| resolve_any(&["bun", "tsx", "ts-node"])).as_ref()
}

fn python_runtime() -> Option<&'static PathBuf> {
    static PY: OnceLock<Option<PathBuf>> = OnceLock::new();
    PY.get_or_init(|| resolve_any(&["python3", "python"])).as_ref()
}

fn rustc_runtime() -> Option<&'static PathBuf> {
    static RUSTC: OnceLock<Option<PathBuf>> = OnceLock::new();
    RUSTC.get_or_init(|| resolve_any(&["rustc"])).as_ref()
}

fn go_runtime() -> Option<&'static PathBuf> {
    static GO: OnceLock<Option<PathBuf>> = OnceLock::new();
    GO.get_or_init(|| resolve_any(&["go"])).as_ref()
}

fn bash_runtime() -> Option<&'static PathBuf> {
    static BASH: OnceLock<Option<PathBuf>> = OnceLock::new();
    BASH.get_or_init(|| resolve_any(&["bash", "sh"])).as_ref()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn missing_runtime(label: &str) -> ExecuteResult {
    ExecuteResult {
        stdout: String::new(),
        stderr: format!(
            "Runtime not found: {label}\n\
             Make sure it is installed and on your PATH.\n\
             Tip: on macOS, Tauri apps may not inherit your shell PATH — \
             try launching from the terminal: `open /Applications/YourApp.app`"
        ),
        exit_code: 127,
    }
}

/// Return the bare filename of a resolved binary path (e.g. "bun", "node").
fn runtime_name(path: &PathBuf) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

// ---------------------------------------------------------------------------
// Core process runner
// ---------------------------------------------------------------------------

fn run_command(mut cmd: Command, timeout_ms: u64) -> ExecuteResult {
    cmd.stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            return ExecuteResult {
                stdout: String::new(),
                stderr: format!("Failed to spawn process: {e}"),
                exit_code: 1,
            };
        }
    };

    // Drain stdout/stderr on background threads to prevent pipe-buffer deadlock.
    let stdout_reader = child.stdout.take().expect("stdout piped");
    let stderr_reader = child.stderr.take().expect("stderr piped");

    let stdout_thread = thread::spawn(move || {
        let mut buf = String::new();
        std::io::BufReader::new(stdout_reader)
            .read_to_string(&mut buf)
            .ok();
        buf
    });

    let stderr_thread = thread::spawn(move || {
        let mut buf = String::new();
        std::io::BufReader::new(stderr_reader)
            .read_to_string(&mut buf)
            .ok();
        buf
    });

    let timeout = Duration::from_millis(timeout_ms);
    match child.wait_timeout(timeout) {
        Ok(Some(status)) => {
            let stdout = stdout_thread.join().unwrap_or_default();
            let stderr = stderr_thread.join().unwrap_or_default();
            ExecuteResult {
                stdout,
                stderr,
                exit_code: status.code().unwrap_or(1),
            }
        }
        Ok(None) => {
            child.kill().ok();
            child.wait().ok();
            let stdout = stdout_thread.join().unwrap_or_default();
            let stderr = stderr_thread.join().unwrap_or_default();
            ExecuteResult {
                stdout,
                stderr: format!("Execution timed out after {timeout_ms}ms\n{stderr}"),
                exit_code: 124,
            }
        }
        Err(e) => {
            child.kill().ok();
            child.wait().ok();
            ExecuteResult {
                stdout: String::new(),
                stderr: format!("Wait error: {e}"),
                exit_code: 1,
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Language executors
// ---------------------------------------------------------------------------

pub fn execute_javascript(code: &str, timeout_ms: u64) -> ExecuteResult {
    let Some(runtime) = js_runtime() else {
        return missing_runtime("bun / node / nodejs");
    };

    let mut tmp = match tempfile::Builder::new().prefix("nb-").suffix(".js").tempfile() {
        Ok(f) => f,
        Err(e) => return ExecuteResult { stdout: String::new(), stderr: format!("Failed to create temp file: {e}"), exit_code: 1 },
    };
    if let Err(e) = tmp.write_all(code.as_bytes()) {
        return ExecuteResult { stdout: String::new(), stderr: format!("Failed to write code: {e}"), exit_code: 1 };
    }

    let path = tmp.path().to_path_buf();
    let mut cmd = Command::new(runtime);
    // bun requires `bun run <file>`; node accepts `node <file>` directly
    if runtime_name(runtime) == "bun" {
        cmd.arg("run");
    }
    cmd.arg(&path);

    let result = run_command(cmd, timeout_ms);
    drop(tmp);
    result
}

pub fn execute_typescript(code: &str, timeout_ms: u64) -> ExecuteResult {
    let Some(runtime) = ts_runtime() else {
        return missing_runtime("bun / tsx / ts-node");
    };

    // Plain `node` cannot run .ts files — give a clear, actionable error.
    let name = runtime_name(runtime);
    if name == "node" || name == "nodejs" {
        return ExecuteResult {
            stdout: String::new(),
            stderr: "TypeScript execution requires bun, tsx, or ts-node.\n\
                     Plain node cannot run .ts files directly.\n\
                     Install one: `npm i -g tsx`"
                .to_string(),
            exit_code: 1,
        };
    }

    let mut tmp = match tempfile::Builder::new().prefix("nb-").suffix(".ts").tempfile() {
        Ok(f) => f,
        Err(e) => return ExecuteResult { stdout: String::new(), stderr: format!("Failed to create temp file: {e}"), exit_code: 1 },
    };
    if let Err(e) = tmp.write_all(code.as_bytes()) {
        return ExecuteResult { stdout: String::new(), stderr: format!("Failed to write code: {e}"), exit_code: 1 };
    }

    let path = tmp.path().to_path_buf();
    let mut cmd = Command::new(runtime);
    // bun: `bun run file.ts`  |  tsx: `tsx file.ts`  |  ts-node: `ts-node file.ts`
    if name == "bun" {
        cmd.arg("run");
    }
    cmd.arg(&path);

    let result = run_command(cmd, timeout_ms);
    drop(tmp);
    result
}

pub fn execute_python(code: &str, timeout_ms: u64) -> ExecuteResult {
    let Some(runtime) = python_runtime() else {
        return missing_runtime("python3 / python");
    };

    let mut tmp = match tempfile::Builder::new().prefix("nb-").suffix(".py").tempfile() {
        Ok(f) => f,
        Err(e) => return ExecuteResult { stdout: String::new(), stderr: format!("Failed to create temp file: {e}"), exit_code: 1 },
    };
    if let Err(e) = tmp.write_all(code.as_bytes()) {
        return ExecuteResult { stdout: String::new(), stderr: format!("Failed to write code: {e}"), exit_code: 1 };
    }

    let path = tmp.path().to_path_buf();
    let mut cmd = Command::new(runtime);
    cmd.arg(&path);

    let result = run_command(cmd, timeout_ms);
    drop(tmp);
    result
}

pub fn execute_rust(code: &str, timeout_ms: u64) -> ExecuteResult {
    let Some(rustc) = rustc_runtime() else {
        return missing_runtime("rustc (install via rustup: https://rustup.rs)");
    };

    let tmp_dir = match tempfile::tempdir() {
        Ok(d) => d,
        Err(e) => return ExecuteResult { stdout: String::new(), stderr: format!("Failed to create temp dir: {e}"), exit_code: 1 },
    };
    let src = tmp_dir.path().join("main.rs");
    let bin = tmp_dir.path().join("main");

    if let Err(e) = std::fs::write(&src, code) {
        return ExecuteResult { stdout: String::new(), stderr: format!("Failed to write Rust source: {e}"), exit_code: 1 };
    }

    let wall_start = Instant::now();
    let compile_budget = (timeout_ms / 2).min(30_000);

    let mut compile_cmd = Command::new(rustc);
    compile_cmd.arg(&src).arg("-o").arg(&bin);
    let compile_result = run_command(compile_cmd, compile_budget);

    if compile_result.exit_code != 0 {
        return compile_result;
    }

    let elapsed = wall_start.elapsed().as_millis() as u64;
    let run_budget = timeout_ms.saturating_sub(elapsed).max(500);
    run_command(Command::new(&bin), run_budget)
}

pub fn execute_bash(code: &str, timeout_ms: u64) -> ExecuteResult {
    let Some(runtime) = bash_runtime() else {
        return missing_runtime("bash / sh");
    };

    let mut tmp = match tempfile::Builder::new().prefix("nb-").suffix(".sh").tempfile() {
        Ok(f) => f,
        Err(e) => return ExecuteResult { stdout: String::new(), stderr: format!("Failed to create temp file: {e}"), exit_code: 1 },
    };
    if let Err(e) = tmp.write_all(code.as_bytes()) {
        return ExecuteResult { stdout: String::new(), stderr: format!("Failed to write code: {e}"), exit_code: 1 };
    }

    let path = tmp.path().to_path_buf();
    let mut cmd = Command::new(runtime);
    cmd.arg(&path);

    let result = run_command(cmd, timeout_ms);
    drop(tmp);
    result
}

pub fn execute_go(code: &str, timeout_ms: u64) -> ExecuteResult {
    let Some(runtime) = go_runtime() else {
        return missing_runtime("go (install via https://go.dev/dl)");
    };

    let mut tmp = match tempfile::Builder::new().prefix("nb-").suffix(".go").tempfile() {
        Ok(f) => f,
        Err(e) => return ExecuteResult { stdout: String::new(), stderr: format!("Failed to create temp file: {e}"), exit_code: 1 },
    };
    if let Err(e) = tmp.write_all(code.as_bytes()) {
        return ExecuteResult { stdout: String::new(), stderr: format!("Failed to write code: {e}"), exit_code: 1 };
    }

    let path = tmp.path().to_path_buf();
    let mut cmd = Command::new(runtime);
    cmd.arg("run").arg(&path);

    let result = run_command(cmd, timeout_ms);
    drop(tmp);
    result
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

pub fn execute_code(language: &str, code: &str, timeout_ms: u64) -> ExecuteResult {
    match language {
        "javascript" => execute_javascript(code, timeout_ms),
        "typescript" => execute_typescript(code, timeout_ms),
        "python" => execute_python(code, timeout_ms),
        "rust" => execute_rust(code, timeout_ms),
        "bash" | "shell" => execute_bash(code, timeout_ms),
        "go" => execute_go(code, timeout_ms),
        _ => ExecuteResult {
            stdout: String::new(),
            stderr: format!("Unsupported language: {language}"),
            exit_code: 1,
        },
    }
}