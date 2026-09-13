# 🎭 PlaySpec

> **Spec-Driven Development (SDD) for AI coding assistants — where the specification is an executable Playwright test.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js: 22+](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-First-orange.svg)](https://playwright.dev/)

Inspired by [OpenSpec](https://github.com/Fission-AI/OpenSpec), **PlaySpec** bridges high-level feature requirements and low-level code implementation. Instead of relying only on Markdown prose that easily drifts from reality, PlaySpec pairs every specification with an **automated, executable Playwright E2E test suite**, **Page Object Model**, and **Fixture**.

---

## ⚡ The Mental Model: Playwright-First

| Stage | OpenSpec (`@fission-ai/openspec`) | PlaySpec (`playspec`) |
| :--- | :--- | :--- |
| **1. Spec Definition** | Abstract Markdown prose (`SHALL` / `WHEN/THEN`) | **Dual Specification**: Markdown user stories **coupled 1:1 with executable Playwright E2E tests**, Page Objects, and Fixtures. |
| **2. Red Phase (ATDD)** | None (prose only) | **Strict Red Gate**: Scaffolding creates a failing Playwright test representing unmet requirements *before* writing any code. |
| **3. Verification** | Subjective inspection by AI | **Deterministic Automation**: Playwright runs in headless fast mode (`E2E_FAST=true`) or full visual mode (screenshots & traces). |
| **4. Living Documentation** | Markdown files in `openspec/specs/` | Living specifications in `specs/features/` linking directly to passing Playwright test files. |
| **5. Developer Tooling** | File-based only | Clean hooks for terminal runners and TUIs (e.g. `command-launcher/commands.json`). |

---

## 🔄 The Lifecycle

```text
 1. Explore       Analyze existing tests, routes, and feature boundaries
    │
    ▼
 2. Propose       Scaffold change directory + Playwright test, page & fixture
    │
    ▼
 3. Red Phase     Run headless test to assert expected failure (unmet requirement)
    │
    ▼
 4. Apply         AI or developer implements backend, frontend, and DB schema
    │
    ▼
 5. Verify        Run Playwright test in fast mode or full visual report mode
    │
    ▼
 6. Archive       Promote spec to specs/features/, update README, archive change
```

---

## 🚀 Quick Start

### 1. Initialize PlaySpec in your project
```bash
npx playspec init
```
This generates `playspec.config.json`, `specs/features/`, and `changes/archive/`.

### 2. Explore Existing Features
```bash
npx playspec explore "appointment"
```

### 3. Propose a New Feature
```bash
npx playspec propose document-expiry --title "Document Expiry Alerts"
```
This scaffolds:
1. `changes/document-expiry/` with `proposal.md`, `spec.md`, `design.md`, `tasks.md`, and `meta.json`.
2. `tests/document-expiry.e2e.ts` (Playwright test with phase tracking and automatic cleanup).
3. `pages/document-expiry.page.ts` (Page Object class).
4. `fixtures/document-expiry.ts` (Playwright test fixture).
5. Registers test scripts in `package.json`.

### 4. Red Phase: Prove Unmet Requirements
```bash
npx playspec red document-expiry
```
Runs the test in fast headless mode. Confirms that the test fails cleanly against the unbuilt feature.

### 5. Implementation Phase
```bash
npx playspec apply document-expiry
```
Displays the implementation checklist and guidelines for your AI assistant or team.

### 6. Green Phase: Verify Passing Test
```bash
# Fast mode (headless, skip screenshots)
npx playspec verify document-expiry --fast

# Visual report mode (captures screenshots and traces)
npx playspec verify document-expiry
```

### 7. Archive & Living Docs
```bash
npx playspec archive document-expiry
```
Promotes the verified specification into `specs/features/document-expiry.md` and archives the change directory.

---

## ⚙️ Configuration (`playspec.config.json`)

PlaySpec auto-detects most common project structures out of the box. You can customize paths in `playspec.config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/alien35/playspec/main/schema.json",
  "specsDir": "specs",
  "changesDir": "changes",
  "e2e": {
    "dir": "e2e",
    "cwd": ".",
    "testsDir": "tests",
    "pagesDir": "pages",
    "fixturesDir": "fixtures",
    "configPath": "playwright.config.ts"
  },
  "tui": {
    "commandsJsonPath": "command-launcher/commands.json",
    "defaultGroup": "E2E"
  }
}
```

---

## 🤖 AI Assistant Workflows

PlaySpec works seamlessly with AI coding assistants (Antigravity, Cursor, Claude Code, GitHub Copilot, OpenCode):

- **`/spec:explore [idea]`**: Ask the AI to research existing tests, routes, and APIs before starting.
- **`/spec:propose <slug>`**: Tell the AI to scaffold the change and the Playwright test first.
- **`/spec:red <slug>`**: Run the Red Phase test and verify the failure reason.
- **`/spec:apply <slug>`**: Direct the AI to implement the code to satisfy the test.
- **`/spec:verify <slug>`**: Run the verification test until green.
- **`/spec:archive <slug>`**: Promote the specification to living documentation.

---

## 📄 License

MIT © [Alexander Leon](https://github.com/alien35)
