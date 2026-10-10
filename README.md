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
| **3. Verification & Architecture** | Subjective inspection by AI | **Reality-Grounded Verification**: Tests pass deterministically and compiler emits **reality-verified Mermaid sequence diagrams** from actual execution traces. |
| **4. Living Documentation** | Markdown files in `openspec/specs/` | Living specifications in `specs/features/` linking directly to passing Playwright test files and generated sequence diagrams. |
| **5. Developer Tooling** | File-based only | Clean hooks for terminal runners, TUIs, and dual-stream trace collectors. |

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
 5. Verify        Run Playwright test & compile reality-verified sequence diagram
    │
    ▼
 6. Archive       Promote spec & diagram to specs/features/, update README & archive
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
Upon passing, PlaySpec automatically correlates runtime causal logs and HTTP network boundaries to compile a **reality-verified Mermaid sequence diagram** into `changes/document-expiry/design.md`.

### 6b. Video Recording with Virtual Cursor Overlay
PlaySpec fixtures automatically scaffold a high-visibility virtual cursor overlay with animated click ripples and drag reticles.

To capture a high-definition video of the user journey in action:
```bash
# Record execution video with visual cursor telemetry
npx playspec verify document-expiry --video

# Customize slow-motion pacing (in ms)
npx playspec verify document-expiry --video --slow-mo 200
```
The video artifact is saved to `changes/document-expiry/recording.webm`. When you run `npx playspec archive`, it is automatically promoted to `specs/features/assets/` and embedded into the living specification.

### 7. Inspect or Preview Sequence Diagram
```bash
# Preview the generated sequence diagram in terminal
npx playspec diagram document-expiry

# Export raw correlated event graph as JSON
npx playspec diagram document-expiry --json
```

### 8. Archive & Living Docs
```bash
npx playspec archive document-expiry
```
Promotes the verified specification AND the generated reality-verified sequence diagram into `specs/features/document-expiry.md` and archives the change directory.

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
  "diagrams": {
    "enabled": true,
    "apiPrefixes": ["/api/", "/graphql", "/trpc/"],
    "subsystems": {
      "OUTBOX": "Outbox Queue",
      "SYNC": "Sync Worker",
      "AUTH": "Auth Guard"
    },
    "maxInteractions": 60
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
