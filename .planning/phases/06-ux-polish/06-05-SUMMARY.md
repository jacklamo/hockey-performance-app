---
phase: 06-ux-polish
plan: 05
subsystem: forms
tags: [ux, loading-states, lucide-react, forms]
requirements: [UX-03]

dependency_graph:
  requires: []
  provides: [Loader2 spinner feedback on all three form submit buttons]
  affects: [app/games/add/page.tsx, app/games/[id]/edit/page.tsx, app/games/[id]/mental/page.tsx]

tech_stack:
  added: []
  patterns: [Loader2 conditional JSX pattern — isLoading ? <><Loader2 .../> Text</> : 'Idle Text']

key_files:
  modified:
    - app/games/add/page.tsx
    - app/games/[id]/edit/page.tsx
    - app/games/[id]/mental/page.tsx

decisions:
  - Add game submitting text is 'Adding...' (not 'Saving...') per UX locked decisions in CONTEXT.md
  - FileText icon preserved in idle PDF label state via conditional JSX (not removed)

metrics:
  duration: ~10 minutes
  completed: 2026-07-18
  tasks_completed: 2
  files_modified: 3
---

# Phase 6 Plan 5: Loader2 Spinner Feedback on All Form Submit Buttons Summary

Wired Loader2 spinner feedback to all three form submit buttons and the PDF import label using each page's existing loading state variables — zero new state, zero logic changes, purely mechanical UI wiring.

## What Was Done

### Task 1 — app/games/add/page.tsx (commit e102180)

- Added `Loader2` to the existing `lucide-react` import alongside `ArrowLeft` and `FileText`
- Submit button: replaced `{isLoading ? 'Saving...' : 'Save Game'}` with `<Loader2 animate-spin inline mr-2 /> Adding...` / `'Save Game'` conditional — text changed from 'Saving...' to 'Adding...' per locked UX decisions
- PDF import label: replaced `{isImporting ? 'Parsing...' : 'Import from Instat PDF'}` with `<Loader2 animate-spin /> Importing...` / `<FileText /> Import from Instat PDF` conditional — preserves FileText icon in idle state

### Task 2 — edit/page.tsx + mental/page.tsx (commit 50907b7)

**app/games/[id]/edit/page.tsx:**
- Added `Loader2` to existing `lucide-react` import (`ArrowLeft, Loader2`)
- Submit button: replaced `{isSaving ? 'Saving...' : 'Save Changes'}` with Loader2 + 'Saving...' / 'Save Changes' conditional

**app/games/[id]/mental/page.tsx:**
- Added `Loader2` to existing `lucide-react` import (`ArrowLeft, Loader2`)
- Submit button: replaced `{isLoading ? 'Saving...' : 'Save Check-In'}` with Loader2 + 'Saving...' / 'Save Check-In' conditional
- `disabled={isLoading || showSuccess}` preserved unchanged

## Verification

- TypeScript: `npx tsc --noEmit` — no errors
- Tests: 36 passed, 1 todo, 0 failures
- Grep confirms Loader2 in all three files at import + usage sites

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- app/games/add/page.tsx — FOUND, contains Loader2
- app/games/[id]/edit/page.tsx — FOUND, contains Loader2
- app/games/[id]/mental/page.tsx — FOUND, contains Loader2
- Commit e102180 — FOUND
- Commit 50907b7 — FOUND
