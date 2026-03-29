use crate::db::{cells, notebooks};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: Option<String>,
    pub error: Option<String>,
}

pub fn notebook_to_markdown(
    notebook: &notebooks::Notebook,
    cells: &[cells::Cell],
) -> String {
    let mut lines: Vec<String> = vec![format!("# {}", notebook.title), String::new()];

    if !notebook.tags.is_empty() {
        lines.push(format!("> Tags: {}", notebook.tags));
        lines.push(String::new());
    }

    for cell in cells {
        if cell.cell_type == "markdown" {
            lines.push(cell.content.clone());
            lines.push(String::new());
        } else {
            let ext = lang_ext(&cell.language);
            lines.push(format!("```{ext}"));
            lines.push(cell.content.clone());
            lines.push("```".to_string());
            lines.push(String::new());
        }
    }

    lines.join("\n")
}

fn lang_ext(language: &str) -> &str {
    match language {
        "typescript" => "ts",
        "javascript" => "js",
        "python" => "py",
        "rust" => "rs",
        "go" => "go",
        "bash" | "shell" => "sh",
        other => other,
    }
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

pub fn notebook_to_html(notebook: &notebooks::Notebook, cells: &[cells::Cell]) -> String {
    let escaped_title = escape_html(&notebook.title);
    let tags: Vec<&str> = notebook.tags.split(',').filter(|t| !t.trim().is_empty()).collect();

    let cells_html: String = cells
        .iter()
        .enumerate()
        .map(|(idx, cell)| {
            if cell.cell_type == "markdown" {
                format!(
                    r#"  <div class="cell markdown-cell">
    <div class="cell-indicator">[{}]</div>
    <pre class="cell-content">{}</pre>
  </div>"#,
                    idx + 1,
                    escape_html(&cell.content)
                )
            } else {
                let ext = lang_ext(&cell.language);
                format!(
                    r#"  <div class="cell code-cell">
    <div class="cell-header">
      <span class="cell-indicator">[{}]</span>
      <span class="cell-lang">{}</span>
    </div>
    <pre><code class="language-{}">{}</code></pre>
  </div>"#,
                    idx + 1,
                    escape_html(&cell.language),
                    escape_html(ext),
                    escape_html(&cell.content)
                )
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    let tags_html = if !tags.is_empty() {
        let tag_spans: String = tags
            .iter()
            .map(|t| format!(r#"<span class="tag">{}</span>"#, escape_html(t.trim())))
            .collect::<Vec<_>>()
            .join("");
        format!(r#"<div class="tags">{}</div>"#, tag_spans)
    } else {
        String::new()
    };

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; background: #0a0a0a; color: #e5e5e5; line-height: 1.6; }}
    h1 {{ font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }}
    .tags {{ display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 2rem; }}
    .tag {{ background: #1c1c1c; border: 1px solid #333; border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.72rem; color: #888; }}
    .cell {{ margin-bottom: 1.5rem; border-radius: 0.75rem; overflow: hidden; border: 1px solid #222; }}
    .cell-header {{ display: flex; align-items: center; gap: .75rem; padding: .5rem 1rem; background: #111; border-bottom: 1px solid #222; font-size: .75rem; }}
    .cell-indicator {{ font-family: monospace; color: #555; font-weight: 700; }}
    .cell-lang {{ background: #1a1a1a; border: 1px solid #333; border-radius: 4px; padding: .1rem .5rem; color: #888; font-family: monospace; font-size: .7rem; }}
    .code-cell pre {{ margin: 0; padding: 1rem 1.25rem; background: #0d0d0d; overflow-x: auto; }}
    .code-cell code {{ font-family: monospace; font-size: .85rem; color: #d4d4d4; }}
    .markdown-cell {{ padding: 1rem 1.25rem; background: #0f0f0f; }}
    .markdown-cell .cell-content {{ font-size: .875rem; color: #ccc; white-space: pre-wrap; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  {tags_html}
{cells_html}
</body>
</html>"#,
        title = escaped_title,
        tags_html = tags_html,
        cells_html = cells_html
    )
}

// ─── Import from Markdown ──────────────────────────────────────────────────────

pub struct ImportedCell {
    pub cell_type: String,
    pub language: String,
    pub content: String,
}

pub struct ImportedNotebook {
    pub title: String,
    pub tags: String,
    pub cells: Vec<ImportedCell>,
}

/// Parse a Markdown file previously exported by this app (or compatible format):
/// - First `# Heading` → notebook title
/// - `> Tags: x, y` line → tags
/// - Fenced code blocks (\`\`\`lang … \`\`\`) → code cells
/// - Any other non-empty text block → markdown cells
pub fn parse_markdown_import(content: &str) -> ImportedNotebook {
    let mut title = String::from("Imported Notebook");
    let mut tags = String::new();
    let mut cells: Vec<ImportedCell> = Vec::new();

    let mut in_code_block = false;
    let mut code_lang = String::new();
    let mut code_lines: Vec<&str> = Vec::new();
    let mut prose_lines: Vec<&str> = Vec::new();

    fn flush_prose(prose: &mut Vec<&str>, cells: &mut Vec<ImportedCell>) {
        let text = prose.join("\n").trim().to_string();
        if !text.is_empty() {
            cells.push(ImportedCell {
                cell_type: "markdown".into(),
                language: "markdown".into(),
                content: text,
            });
        }
        prose.clear();
    }

    for line in content.lines() {
        if in_code_block {
            if line.starts_with("```") {
                // End of code block
                in_code_block = false;
                let code = code_lines.join("\n");
                let lang = ext_to_lang(&code_lang);
                cells.push(ImportedCell {
                    cell_type: "code".into(),
                    language: lang.to_string(),
                    content: code,
                });
                code_lines.clear();
                code_lang.clear();
            } else {
                code_lines.push(line);
            }
        } else if line.starts_with("```") {
            // Start of code block — flush any pending prose first
            flush_prose(&mut prose_lines, &mut cells);
            code_lang = line.trim_start_matches('`').to_string();
            in_code_block = true;
        } else if line.starts_with("# ") && title == "Imported Notebook" {
            title = line[2..].trim().to_string();
        } else if line.starts_with("> Tags:") {
            tags = line[">> Tags:".len() - 1..].trim().to_string();
        } else {
            prose_lines.push(line);
        }
    }

    // Flush any remaining prose
    flush_prose(&mut prose_lines, &mut cells);

    ImportedNotebook { title, tags, cells }
}

fn ext_to_lang(ext: &str) -> &str {
    match ext {
        "ts" => "typescript",
        "js" => "javascript",
        "py" => "python",
        "rs" => "rust",
        "sh" | "bash" => "bash",
        "go" => "go",
        other => other,
    }
}
