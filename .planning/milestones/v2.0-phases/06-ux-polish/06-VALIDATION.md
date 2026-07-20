---
phase: 6
slug: ux-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-18
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest / React Testing Library (Next.js built-in) |
| **Config file** | jest.config.ts (if exists) or package.json scripts |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | UX-01 | build | `npm run build` | ✅ | ⬜ pending |
| 6-01-02 | 01 | 1 | UX-02 | build | `npm run build` | ✅ | ⬜ pending |
| 6-01-03 | 01 | 1 | UX-03 | build | `npm run build` | ✅ | ⬜ pending |
| 6-01-04 | 01 | 1 | UX-04 | build | `npm run build` | ✅ | ⬜ pending |
| 6-01-05 | 01 | 1 | UX-05 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No new test infrastructure needed — UX polish uses build verification and manual UI checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Logout button visible on every page | UX-01 | Visual layout check | Navigate to /dashboard, /games, /games/[id] — confirm logout button in header |
| Skeleton shows immediately on navigation | UX-02 | Timing/visual check | Throttle network, navigate between pages — confirm skeleton before data |
| Submit button spinner + disabled state | UX-03 | Interaction timing | Click Add Game submit — confirm spinner appears and button is disabled |
| Empty state displays with CTA | UX-04 | Content/UI check | Log in with account with no games — confirm empty state message and button |
| Error state with retry button | UX-05 | Network simulation | Disconnect network, load /dashboard — confirm error message and retry button |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
