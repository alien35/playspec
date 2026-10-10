---
name: playspec
description: >-
  Spec-Driven Development (SDD) toolkit that pairs executable Playwright E2E tests,
  interactive virtual cursor overlays, high-definition execution video generation,
  Causal Numbered Pipeline Traces, and reality-verified Mermaid sequence diagrams to assess,
  specify, develop, and verify features with zero speculative drift. Use when the user asks to
  propose or assess features, implement PlaySpec workflows, generate reality-verified diagrams,
  execute red-green test cycles, record visual cursor test replays, or maintain living specification documents.
---

# PlaySpec: Playwright-First Spec-Driven Development (`playspec`)

**PlaySpec** is a Spec-Driven Development (SDD) toolkit designed for AI coding agents and engineering teams. It bridges Markdown specifications (`spec.md`, `design.md`, `tasks.md`), executable Playwright E2E test suites (`.e2e.ts`, Page Objects, fixtures), **Interactive Virtual Cursor Overlays**, **High-Definition Video Recordings**, and **Causal Numbered Pipeline Traces** (`[<TAG>-TRACE]`).

Instead of static prose or speculative diagrams that drift from reality, PlaySpec intercepts live browser execution (user actions, synthetic cursor clicks/ripples, causal pipeline events, and network boundaries) during test runs, produces deterministic video recordings, and compiles **reality-verified Mermaid sequence diagrams** directly into living technical documentation.

---

## 🎯 Core Concepts

### 1. Dual Specification
Every feature change has two representations in lockstep:
- **Markdown Specification** (`changes/<slug>/`):
  - `proposal.md`: Problem motivation, user personas, scope boundaries.
  - `spec.md`: User journeys, scenario matrix, Gherkin-style preconditions and assertions.
  - `design.md`: Technical architecture, UI components, state machines, and the reality-verified sequence diagram.
  - `tasks.md`: Sequential checklist spanning scaffolding, red phase, implementation, verification, and archiving.
  - `meta.json`: Machine-readable tracking metadata.
- **Executable Specification** (`e2e/tests/<slug>.e2e.ts`, `e2e/pages/<slug>.page.ts`, `e2e/fixtures/<slug>.ts`, `e2e/helpers/virtualCursor.ts`):
  - Executable test verifying the exact journey described in `spec.md`.

### 2. Interactive Virtual Cursor Overlay
PlaySpec injects an animated desktop pointer and click reticle into the browser context:
- **Target Reticle & Arrow**: High-contrast, drop-shadowed cursor visible in headed runs, Playwright UI mode (`--ui`), traces, and video recordings.
- **Click & Drag Telemetry**: Expands contracting target reticles and outward ripple shockwaves on `mousedown`, `mouseup`, and `click` events.
- **Zero Interference**: Fully non-obstructive via `pointer-events: none !important` and `z-index: 2147483647`.

### 3. High-Definition Visual Replay Artifacts
During verification, PlaySpec can record 1440x1000 video of test runs with configurable slow-motion pacing (`--slow-mo`). Videos are captured as `.webm` files, stored with the feature change, and promoted to permanent living spec assets.

### 4. Dual-Stream Trace Correlation & Reality-Verified Diagrams
During `playspec verify <slug>`, the PlaySpec fixture collects two concurrent execution streams:
1. **Causal Pipeline Traces**: Browser console logs matching `[<TAG>-TRACE] 1 -> 2 -> ...` from instrumented pipeline components.
2. **Network Boundary Interceptions**: Fetch / XHR / REST / GraphQL requests and responses crossing the client-server boundary.

PlaySpec aligns these chronological streams into an autonumbered Mermaid sequence diagram, visualizing exactly how user actions trigger causal steps, network requests, state transitions, and UI resolutions.

---

## 🔄 The 7-Phase SDD Lifecycle

```text
 1. EXPLORE ────► 2. PROPOSE ────► 3. RED ────► 4. APPLY ────► 5. VERIFY ────► 6. DIAGRAM ────► 7. ARCHIVE
 (assess tech)    (scaffold)      (assert fail)  (implement)   (assert pass)  (Mermaid sync)   (living spec)
```

### Phase 1: Explore (`playspec explore [query]`)
Assess existing features, living specs in `specs/features/`, active changes in `changes/`, and related E2E tests to understand tech stack capabilities, architectural boundaries, and scope overlap before writing code.

```bash
npx playspec explore "pdf"
```

### Phase 2: Propose (`playspec propose <slug> --title "<Title>"`)
Scaffold the feature change directory and executable test suite:
- `changes/<slug>/` with `proposal.md`, `spec.md`, `design.md`, `tasks.md`, `meta.json`.
- `e2e/helpers/virtualCursor.ts`: Visual mouse overlay helper.
- `e2e/tests/<slug>.e2e.ts`: Test journey matching the spec.
- `e2e/pages/<slug>.page.ts`: Page Object encapsulating selectors and interactions.
- `e2e/fixtures/<slug>.ts`: Playwright test fixture with virtual cursor and dual-stream trace collector.
- Registers test scripts in `package.json` (`test:e2e:<slug>` and `test:e2e:<slug>:fast`).

```bash
npx playspec propose pdf-page-render --title "PDF Page Rendering and Raster Scaling"
```

### Phase 3: Red Phase (`playspec red <slug>`)
Run the test in fast headless mode to confirm it **fails for the expected reason** (unbuilt UI element, missing pipeline handler, or unsatisfied assertion). A test that unexpectedly passes or fails with an unhandled exception must be revised.

```bash
npx playspec red pdf-page-render
```

### Phase 4: Apply (`playspec apply <slug>`)
Review `changes/<slug>/tasks.md` and `design.md`, then implement the feature code:
- UI components and state machines.
- Add or connect Causal Pipeline Traces (`[TAG-TRACE] 1 -> ...`) for any asynchronous flows.
- Implement API / backend interactions.

```bash
npx playspec apply pdf-page-render
```

### Phase 5: Verify (`playspec verify <slug> [--fast] [--headed] [--video] [--slow-mo <ms>]`)
Execute the Playwright test suite against the live app.
- When all assertions pass, `meta.json` status updates to `verified`.
- PlaySpec automatically captures execution traces and triggers diagram compilation into `changes/<slug>/design.md`.
- When `--video` is specified, records test execution with the virtual cursor and saves `changes/<slug>/recording.webm`.

```bash
# Fast verification (headless, skip screenshots)
npx playspec verify pdf-page-render --fast

# Visual report verification (generates full screenshots)
npx playspec verify pdf-page-render

# High-definition video recording with virtual cursor
npx playspec verify pdf-page-render --video

# Slow-motion video recording for visual inspection
npx playspec verify pdf-page-render --video --slow-mo 200
```

### Phase 6: Diagram (`playspec diagram <slug>`)
Compile execution traces into a reality-verified Mermaid sequence diagram and inject it between `<!-- PLAYSPEC:SEQUENCE_DIAGRAM:START -->` and `<!-- PLAYSPEC:SEQUENCE_DIAGRAM:END -->` markers in `changes/<slug>/design.md`.

```bash
npx playspec diagram pdf-page-render
```

### Phase 7: Archive (`playspec archive <slug>`)
Promote the completed change to the project's permanent living specifications:
- Saves consolidated specification to `specs/features/<slug>.md`.
- Copies recorded video to `specs/features/assets/<slug>.webm` and embeds it directly into the living spec.
- Archives working files to `changes/archive/<date>-<slug>/`.
- Cleans up ephemeral workspace state while preserving permanent regression test suites.

```bash
npx playspec archive pdf-page-render
```

---

## ⚙️ Configuration (`playspec.config.json`)

```json
{
  "specsDir": "specs",
  "changesDir": "changes",
  "e2e": {
    "cwd": ".",
    "dir": "e2e",
    "testsDir": "tests",
    "pagesDir": "pages",
    "fixturesDir": "fixtures",
    "configPath": "playwright.config.ts",
    "project": "chromium"
  },
  "diagrams": {
    "enabled": true,
    "apiPrefixes": ["/api/", "/graphql", "/trpc/"],
    "subsystems": {
      "PDF-RENDER": "PDF Renderer",
      "CANVAS": "Canvas Engine",
      "PIN": "Pin System",
      "CAMERA": "Camera Capture"
    }
  }
}
```

---

## 🤖 Agent Usage Rules

1. **Always Follow the Lifecycle**: Do not skip the Red Phase. Asserting expected failure guarantees the E2E test is actively exercising the new capability and not passing vacuously.
2. **Pair with Causal Pipeline Tracing**: When building asynchronous logic (file renders, state queues, optimistic syncs), instrument steps with `[<TAG>-TRACE] 1 -> 2 -> ... [OK]`. PlaySpec automatically picks these up and diagrams them.
3. **Keep Diagrams Reality-Verified**: Never manually edit the Mermaid diagram between the `PLAYSPEC:SEQUENCE_DIAGRAM` markers in `design.md`. Let `playspec verify` or `playspec diagram` synthesize it from real runtime traces.
4. **Produce Video Artifacts on Visual Requests**: When the user requests visual verification, wants to see mouse cursor activity, or asks for demo replays, use `npx playspec verify <slug> --video --slow-mo 150` to generate a self-contained `.webm` recording.
5. **Living Specs as Source of Truth**: Before designing a feature, inspect `specs/features/` via `npx playspec explore` to ensure consistency with prior architectural decisions.
