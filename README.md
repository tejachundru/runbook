# Runbook

A lightweight, native desktop notebook app built with [Tauri 2.0](https://tauri.app/), [Next.js](https://nextjs.org/), and [Rust](https://www.rust-lang.org/).

Create rich notebooks with code cells (TypeScript, Python, Rust, Bash) and markdown cells, organize them into folders, and execute code — all in a fast, native desktop app.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Code Cells** — Write and execute TypeScript, Python, Rust, and Bash code with inline output
- **Markdown Cells** — Write rich markdown with GFM support (tables, strikethrough, task lists)
- **Monaco Editor** — Full-featured code editor with syntax highlighting and IntelliSense
- **Folder Organization** — Organize notebooks into a nested folder hierarchy
- **Search** — Full-text search across all notebooks
- **Auto-Save** — Changes are saved automatically as you type
- **Export** — Export notebooks to Markdown or HTML
- **Dark & Light Themes** — Follows your system theme preference
- **Native Feel** — Built with Tauri for a small (~15 MB) native binary, no bundled Chromium

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Tauri 2.0 (Rust) |
| Frontend | Next.js 16 (static export) |
| UI Components | shadcn/ui + Tailwind CSS v4 |
| Code Editor | Monaco Editor |
| Database | SQLite (via rusqlite) |
| Code Execution | Rust `std::process::Command` |
| Package Manager | Bun |

## Prerequisites

Before you begin, make sure you have the following installed:

- [Bun](https://bun.sh/) — JavaScript runtime and package manager
- [Rust](https://www.rust-lang.org/tools/install) — Rust toolchain (`rustup`)
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/) — Platform-specific system dependencies

**macOS:**
```bash
xcode-select --install
rustup default stable
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/tejachundru/runbook.git
cd runbook
```

### 2. Install dependencies

```bash
bun install
```

### 3. Run in development mode

```bash
bun run dev:tauri
```

This starts the Next.js dev server and launches the Tauri desktop window with hot-reload.

### 4. Build for production

```bash
bun run build:tauri
```

For a macOS DMG installer:

```bash
bun run build:dmg
```

## Project Structure

```
runbook/
├── src/                        # Next.js frontend
│   ├── app/                    # App router pages
│   ├── components/             # React components
│   │   ├── home/               # Home page components
│   │   ├── layout/             # App shell, sidebar, header
│   │   ├── notebook/           # Notebook editor components
│   │   ├── search/             # Search modal
│   │   └── ui/                 # shadcn/ui primitives
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and Tauri wrappers
│   └── types/                  # TypeScript type definitions
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Entry point, Tauri commands
│   │   ├── db/                 # SQLite database layer
│   │   ├── execute/            # Code execution engine
│   │   └── export/             # Markdown/HTML export
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── next.config.ts
```

## Configuration

The app stores its SQLite database at the default Tauri app data directory:

- **macOS:** `~/Library/Application Support/com.runbook.app/`
- **Linux:** `~/.local/share/com.runbook.app/`
- **Windows:** `%APPDATA%\com.runbook.app\`

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start Next.js dev server (browser only) |
| `bun run dev:tauri` | Start Tauri dev mode (native window) |
| `bun run build` | Build Next.js static export |
| `bun run build:tauri` | Build production Tauri app |
| `bun run build:dmg` | Build macOS DMG installer |
| `bun run lint` | Run Biome linter |
| `bun run format` | Format code with Biome |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
