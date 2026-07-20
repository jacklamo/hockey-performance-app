# Phase 6: UX Polish - Research

**Researched:** 2026-07-18
**Domain:** Next.js App Router UX patterns — loading states, skeleton screens, shared components, form feedback
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Shared `Header.tsx` component used on all protected pages: /dashboard, /games, and /games/[id]
- Logout sits top-right of the header as a plain text link ("Logout")
- Header layout: page title on the left, logout link on the right — no nav links
- `signOut` called with explicit `callbackUrl: '/auth/login'` (prevents redirect loop)
- Game detail pages adopt the shared Header; back-link sits below the header as secondary nav
- Header is the first thing built — all other page modifications depend on it
- `loading.tsx` files (Next.js App Router) for route-level loading UI
- Shimmer skeleton style (animated gradient sweep) — not a centered spinner
- High fidelity: skeleton matches the actual page layout (4 stat cards + chart area + table rows on dashboard)
- `/games/[id]` also uses `loading.tsx` with `key={params.id}` on the page to force remount between game navigations
- `/games/page.tsx` must be created as part of this phase (doesn't exist yet)
- Pattern: Loader2 icon (lucide-react, already installed) + text change while submitting
  - "Save" → Loader2 + "Saving..."
  - "Add Game" → Loader2 + "Adding..."
  - "Confirm Delete" → Loader2 + "Deleting..."
  - "Import PDF" → Loader2 + "Importing..."
- Button disabled while submitting to prevent double-submit
- Applied consistently to all form submit buttons: add game, edit game, log mental state, delete (confirm step), PDF import
- Zero new npm dependencies — all UX primitives already installed

### Claude's Discretion

- Skeleton shimmer CSS animation approach (Tailwind animate-pulse or custom keyframes)
- Exact skeleton shape proportions
- Empty state icon/illustration choice
- Error state icon choice
- Copy for empty states and error messages
- Exact color and spacing for the shared Header component

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | User sees a logout button on every protected page that ends their session and redirects to /auth/login | signOut from next-auth/react with callbackUrl; shared Header.tsx eliminates duplication |
| UX-02 | User sees a skeleton loading UI (not a blank screen) during initial page load on /dashboard, /games, and /games/[id] | loading.tsx App Router pattern; custom @keyframes shimmer in globals.css; key={id} for /games/[id] remount |
| UX-03 | User sees a loading indicator on submit buttons during form mutations and the button is disabled to prevent double-submit | Loader2 from lucide-react; isLoading/isSaving/isDeleting/isImporting state already exists in every page |
| UX-04 | User sees an informative empty state (not a blank area) when they have no games logged | Dashboard already has "No Games Yet" block; same pattern needed on /games page |
| UX-05 | User sees a graceful error UI with a retry option when /dashboard or /games fails to load data | Dashboard already has error+retry block using fetchGames; same pattern needed on /games page |
</phase_requirements>

---

## Summary

This phase is pure wiring work — every mechanism needed already exists in the codebase. The app already has `isLoading`, `isSaving`, `isDeleting`, and `isImporting` state on every page, a `fetchGames` useCallback pattern for retryable fetches, a basic empty state on dashboard, and a basic error+retry block on dashboard. Nothing needs to be invented.

The three creation tasks are: (1) `app/components/Header.tsx` — new shared component with title + logout; (2) three `loading.tsx` files at `app/dashboard/`, `app/games/`, and `app/games/[id]/` — shimmer skeletons matching each page's layout; (3) `app/games/page.tsx` — the full games list page, which does not exist yet.

The remaining tasks are wiring: add Loader2 to every submit button, style-uplift the existing error/empty states, and replace the inline header markup in dashboard and game detail with the new shared Header.

**Primary recommendation:** Build Header.tsx first (one component unblocks all page edits), then loading.tsx files (pure addition, no breakage risk), then /games/page.tsx (isolated new file), then wire Loader2 into forms (mechanical, page by page), then style-polish empty/error states last.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.0.1 (installed) | `loading.tsx` route-level loading UI | Built into Next.js — zero config, wraps page in Suspense |
| next-auth | ^4.24.13 (installed) | `signOut({ callbackUrl })` for logout | Already in use for auth; `signOut` handles session teardown |
| lucide-react | ^0.552.0 (installed) | `Loader2`, `LogOut` icons | Already installed; `Loader2` has built-in `animate-spin` support |
| Tailwind CSS 4 | ^4 (installed) | `animate-pulse` for skeleton OR `@keyframes` shimmer | Already the styling system; `animate-pulse` is a first-class utility |
| React | 19.2.0 (installed) | `use()` hook to unwrap async params | React 19 supports `use(Promise)` in client components |

### No New Dependencies

Confirmed from package.json audit: `lucide-react`, `next-auth`, `next`, `react`, and `tailwindcss` are all already installed. Zero `npm install` commands needed for this phase.

---

## Architecture Patterns

### Recommended File Structure (additions only)

```
app/
├── components/
│   └── Header.tsx              # NEW — shared header with title + logout
├── dashboard/
│   ├── loading.tsx             # NEW — dashboard skeleton
│   └── page.tsx                # MODIFY — swap inline header for <Header>
├── games/
│   ├── loading.tsx             # NEW — games list skeleton
│   ├── page.tsx                # NEW — full games list page
│   └── [id]/
│       ├── loading.tsx         # NEW — game detail skeleton
│       └── page.tsx            # MODIFY — swap inline header, add key prop
```

### Pattern 1: Shared Header Component

**What:** A single `'use client'` component that renders the app's top bar on all protected pages. Takes `title` prop. Renders logout as a button that calls `signOut`.

**When to use:** Import in `/dashboard/page.tsx`, `/games/page.tsx`, `/games/[id]/page.tsx`.

```tsx
// app/components/Header.tsx
'use client';

import { signOut } from 'next-auth/react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
```

**Critical:** Always pass `callbackUrl: '/auth/login'` to `signOut`. Without it, next-auth uses `NEXTAUTH_URL` as the redirect target, which can produce a redirect loop in production if the env var is not set to exactly the right value.

### Pattern 2: loading.tsx Route-Level Skeleton

**What:** A server component placed in the same folder as `page.tsx`. Next.js App Router automatically wraps it in a Suspense boundary and shows it during navigation to that route.

**When it shows:** During the initial route transition — before the client component JS is downloaded, parsed, and hydrated. It does NOT show on subsequent data refreshes triggered by the page's own `fetchGames` calls.

**When to use:** Place at `app/dashboard/loading.tsx`, `app/games/loading.tsx`, `app/games/[id]/loading.tsx`.

```tsx
// app/dashboard/loading.tsx
// This is a Server Component (no 'use client' directive)
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skeleton header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-56 bg-gray-200 rounded skeleton-shimmer" />
            <div className="h-5 w-12 bg-gray-200 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
      {/* Skeleton stat cards */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-4 w-24 bg-gray-200 rounded skeleton-shimmer mb-3" />
              <div className="h-10 w-16 bg-gray-200 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
        {/* Skeleton table rows */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-12 bg-gray-50 border-b border-gray-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-6 px-6 py-4 border-b border-gray-100">
              <div className="h-4 w-20 bg-gray-200 rounded skeleton-shimmer" />
              <div className="h-4 w-28 bg-gray-200 rounded skeleton-shimmer" />
              <div className="h-4 w-12 bg-gray-200 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
```

**Shimmer CSS:** Add to `app/globals.css`:
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #e5e7eb 25%,
    #f3f4f6 50%,
    #e5e7eb 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}
```

This gives the gradient sweep effect. `skeleton-shimmer` is a plain CSS class — no Tailwind config needed in Tailwind CSS 4.

### Pattern 3: key Prop for Same-Segment Remount (/games/[id])

**What:** When navigating from `/games/1` to `/games/2`, Next.js does NOT remount the page component (same segment). `loading.tsx` does not re-trigger. Adding `key={id}` to the page's root div forces React to fully unmount/remount the component, which also re-suspends and shows `loading.tsx`.

**When to use:** Only on `/games/[id]/page.tsx`. Other pages don't have same-segment navigation.

```tsx
// app/games/[id]/page.tsx — the key pattern
'use client';
import { use } from 'react'; // React 19 use() hook

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); // synchronously unwrap in React 19 client component
  return <GameDetailContent key={id} id={id} />;
}

function GameDetailContent({ id }: { id: string }) {
  // ... all current page logic, using `id` directly instead of gameId state
}
```

**Alternative if use() feels risky:** Keep the existing `params.then(p => setGameId(p.id))` pattern and add `key={gameId}` on the page's root `<div>`. Either approach is valid.

### Pattern 4: Loader2 Button Feedback

**What:** Replace plain text in submit buttons with `Loader2` icon + text while the async operation is in progress. Button `disabled` attribute prevents double-submit.

**State variables:** Already exist in every page — no new state needed.
- `add/page.tsx`: `isLoading` (form submit), `isImporting` (PDF)
- `edit/page.tsx`: `isSaving`
- `mental/page.tsx`: `isLoading`
- `[id]/page.tsx`: `isDeleting`

```tsx
// Source: lucide-react docs — Loader2 with animate-spin
import { Loader2 } from 'lucide-react';

<button
  type="submit"
  disabled={isSaving}
  className="sm:flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
>
  {isSaving ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Saving...
    </>
  ) : (
    'Save Changes'
  )}
</button>
```

**Text mapping (locked):**
| Button | Idle | Submitting |
|--------|------|------------|
| Add Game submit | "Save Game" | Loader2 + "Adding..." |
| Edit Game submit | "Save Changes" | Loader2 + "Saving..." |
| Mental State submit | "Save Check-In" | Loader2 + "Saving..." |
| Delete confirm | "Confirm Delete" | Loader2 + "Deleting..." |
| PDF Import label | "Import from Instat PDF" | "Parsing..." (no Loader2 — it's a `<label>`, not a `<button>`) |

**Note on PDF import:** The import trigger is a `<label>` wrapping a hidden `<input type="file">`. It already shows "Parsing..." when `isImporting` is true. Adding a Loader2 inside the label is cosmetically optional — the locked decision says "Import PDF → Loader2 + 'Importing...'" but the current text already says "Parsing...". The plan should pick one consistent label text.

### Pattern 5: Empty State

**What:** When `games.length === 0` after a successful fetch, show a call-to-action card rather than an empty table or blank area. The dashboard already has a reasonable version of this — it just needs minor styling polish and the same block needs to be added to `/games/page.tsx`.

**Existing dashboard empty state (lines 156–165 of dashboard/page.tsx):**
```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
  <h2 className="text-2xl font-bold text-gray-900 mb-2">No Games Yet</h2>
  <p className="text-gray-600 mb-6">Start tracking your performance by adding your first game!</p>
  <Link href="/games/add" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
    Add Your First Game
  </Link>
</div>
```

This is already the correct pattern. The icon choice is Claude's discretion — a simple approach is to add a `ClipboardList` or `Trophy` icon from lucide-react above the heading. Since lucide-react is already installed, any icon can be used without new deps.

### Pattern 6: Error State with Retry

**What:** When `fetchGames` throws or returns a non-ok response, show an error card with a "Try Again" button that calls `fetchGames()`. The dashboard already has this pattern (lines 126–140 of dashboard/page.tsx) — it just needs styling polish and the same block needed for `/games/page.tsx`.

**Current dashboard error state:**
```tsx
if (error) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchGames} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Try Again
        </button>
      </div>
    </div>
  );
}
```

**Upgrade:** Wrap in a card with the same `bg-white rounded-lg shadow-sm border border-gray-200` pattern. Add an `AlertCircle` icon from lucide-react. Move the error state inline (within the page layout, below the Header) rather than full-screen-centered, so the user can still see the Header and its Logout button during error states.

**Critical:** The retry button must call `fetchGames` — which is already a `useCallback` — not `window.location.reload()`. Dashboard already does this correctly. Apply same to `/games/page.tsx`.

### Pattern 7: /games/page.tsx (New File)

**What:** A full games list page. Shows all games (not just recent 5). Needs its own fetch, loading, empty, and error states.

**Implementation notes:**
- Uses the same `/api/games` endpoint as dashboard
- Uses same `fetchGames` as `useCallback` pattern
- Renders the shared Header with title "My Games"
- Shows all games in a table (desktop) / card list (mobile) — same table structure as dashboard's "Recent Games" section but without the 5-item slice
- Has its own `loading.tsx` at `app/games/loading.tsx`
- Empty state: same pattern as dashboard
- Error state: same pattern as dashboard (inline card, not full-screen)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Spinning loader icon | Custom SVG animation | `Loader2` from lucide-react + `animate-spin` Tailwind class | Already installed; single import |
| Session logout + redirect | Custom API call to destroy session | `signOut({ callbackUrl: '/auth/login' })` from next-auth | Handles CSRF token, cookie deletion, server-side session teardown |
| Route-level loading UI | `isLoading` check in every page before render | `loading.tsx` App Router file convention | Zero state management; runs before client JS |
| Shimmer animation | Inline style `transition` hacks | CSS `@keyframes shimmer` + `.skeleton-shimmer` class in globals.css | 6 lines of CSS, reusable everywhere |
| Retryable fetch | `window.location.reload()` | `fetchGames` useCallback called directly | No full page refresh; preserves React state |

**Key insight:** Every primitive needed for this phase is already installed. The only "build" work is wiring — connecting existing state variables to existing icons/hooks.

---

## Common Pitfalls

### Pitfall 1: loading.tsx Does Not Re-Trigger on Same-Segment Navigation

**What goes wrong:** User navigates from `/games/1` to `/games/2`. The game detail page shows stale data or no loading feedback because the component doesn't remount.

**Why it happens:** Next.js App Router reuses the same component instance when only dynamic params change within the same route segment. `loading.tsx` only fires on initial navigation to the segment.

**How to avoid:** Add `key={id}` on the game detail page's root element (or inner component). When key changes, React fully unmounts/remounts, re-suspending through loading.tsx.

**Warning signs:** Back button from game detail, then clicking a different game row — if the page flashes old data before loading new data, the key is missing.

### Pitfall 2: Redirect Loop with signOut Default Behavior

**What goes wrong:** After logout, user is redirected back to the dashboard (or to a broken URL), then the middleware redirects to login, then `signOut` triggers again.

**Why it happens:** `signOut()` with no arguments uses the `NEXTAUTH_URL` environment variable as the post-logout redirect. If `NEXTAUTH_URL` is not set correctly in the production environment, this can loop.

**How to avoid:** Always call `signOut({ callbackUrl: '/auth/login' })`. The `callbackUrl` is a relative path — it always works regardless of `NEXTAUTH_URL` configuration.

**Warning signs:** After clicking Logout, the browser URL cycles or lands somewhere unexpected.

### Pitfall 3: Double Skeleton Flash (loading.tsx + Page isLoading State)

**What goes wrong:** User sees the loading.tsx skeleton, then it disappears and briefly shows the page component's own `if (isLoading) return <Loading text>` state, then the real page appears. The user sees two different loading treatments.

**Why it happens:** loading.tsx covers route navigation. Once the client component hydrates, it starts `useEffect → fetchGames`. During that fetch, `isLoading` is true. If the page returns a different loading UI (e.g., the current "Loading..." text div), there's a flash.

**How to avoid:** Update the `if (isLoading)` branch in each page to return the SAME skeleton UI as loading.tsx (or at minimum, a layout that preserves the Header so it doesn't disappear). Simplest approach: in the `isLoading` branch, render the skeleton markup directly rather than `<p>Loading...</p>`.

**Warning signs:** During a slow connection, you can see "Loading..." text appear between the skeleton and the real content.

### Pitfall 4: Error State Hides the Logout Button

**What goes wrong:** When a data fetch fails, the current dashboard returns a full-screen centered error div — which replaces the entire page, including the Header. The user cannot log out while in an error state.

**Why it happens:** Current pattern is `if (error) return <fullscreen-centered-div>`.

**How to avoid:** Render the Header first, then show the error card inline in the main content area. Structure:
```tsx
return (
  <div className="min-h-screen bg-gray-50">
    <Header title="Performance Dashboard" />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error ? <ErrorCard onRetry={fetchGames} /> : <PageContent />}
    </main>
  </div>
);
```

**Warning signs:** Clicking Logout doesn't work when the app is in an error state.

### Pitfall 5: /games Page Does Not Exist

**What goes wrong:** The plan assumes `/games/page.tsx` exists — but it doesn't. The directory `app/games/` only contains `[id]/`, `add/`. There is no `page.tsx` at `app/games/`.

**Why it happens:** This is a known gap called out in CONTEXT.md. The phase must CREATE this file, not modify it.

**How to avoid:** Create `app/games/page.tsx` as a brand new file. It needs its own `fetchGames`, full loading/error/empty/content states, and imports Header.

### Pitfall 6: PDF Import Button Uses a `<label>` Not a `<button>`

**What goes wrong:** The Loader2 + disabled pattern requires a `<button>` element. The PDF import trigger in `app/games/add/page.tsx` is a `<label>` wrapping a hidden `<input type="file">`. Disabling a `<label>` does not visually communicate the same way.

**Why it happens:** File input triggers require the `<label>` for click-to-open-dialog behavior.

**How to avoid:** The existing code already handles this correctly — `disabled={isImporting || isLoading}` is on the `<input>`, and the label uses `opacity-50 cursor-not-allowed` classes when importing. Text change from "Import from Instat PDF" → "Parsing..." is already implemented. Adding Loader2 inside the label is cosmetically possible but structurally different from a button. The plan should note this distinction and treat the label's existing text-change as sufficient, OR add a Loader2 before the text inside the label.

---

## Code Examples

Verified patterns from code audit of this codebase:

### Existing Retry Pattern (Dashboard — keep as-is, just style-uplift)

```tsx
// app/dashboard/page.tsx — lines 48–68 (already correct structure)
const fetchGames = useCallback(async () => {
  try {
    setIsLoading(true);
    setError('');
    const response = await fetch('/api/games');
    if (!response.ok) {
      if (response.status === 401) { router.push('/auth/login'); return; }
      throw new Error('Failed to fetch games');
    }
    const data = await response.json();
    setGames(data.games || []);
  } catch (err) {
    setError('Failed to load games');
  } finally {
    setIsLoading(false);
  }
}, [router]);
```

Note: `setIsLoading(true)` at top of fetchGames is needed for the retry case. The current implementation sets it in component init state (`useState(true)`) but doesn't reset it to true on retry. Add `setIsLoading(true)` and `setError('')` at the start of fetchGames so the retry button also shows the loading state.

### signOut Import (New — not yet in any page)

```tsx
import { signOut } from 'next-auth/react';
// next-auth is already in package.json — no install needed
```

### Loader2 Import (New — Loader2 not yet imported, but LogOut is available)

```tsx
import { Loader2, LogOut } from 'lucide-react';
// lucide-react@0.552.0 is installed — both icons exist
```

### Async Params Pattern (Existing — keep this pattern)

```tsx
// Used in ALL dynamic route pages — do not change this pattern
useEffect(() => {
  params.then(p => setGameId(p.id));
}, [params]);
```

For the key prop approach in game detail, this can be kept as-is and `key={gameId}` added to the root div once `gameId` is resolved.

---

## State of the Art

| Old Approach (Current) | Updated Approach | Impact |
|------------------------|-----------------|--------|
| `<p>Loading...</p>` text in isLoading branch | Skeleton matching page layout | Eliminates blank/flash during data load |
| Inline header markup duplicated in each page | Shared `<Header>` component | One place to update; consistent logout button |
| Submit buttons show only text change ("Saving...") | Loader2 icon + text change, button disabled | Prevents double-submit; clearer feedback |
| Error state is full-screen centered div | Error card inline below Header | Logout remains accessible; layout stable |
| No signOut anywhere in app | `signOut({ callbackUrl: '/auth/login' })` in Header | UX-01 requirement fulfilled |
| /games route 404s | /games/page.tsx with full lifecycle | UX-02/04/05 requirements fulfilled for /games |

---

## Open Questions

1. **fetchGames retry resets isLoading**
   - What we know: The current `fetchGames` does NOT set `setIsLoading(true)` at the start of the function — `isLoading` starts as `true` via `useState(true)` and is only set to `false` in `finally`
   - What's unclear: Should the retry show a skeleton or just inline spinner?
   - Recommendation: Add `setIsLoading(true)` at the start of `fetchGames` so retry shows the skeleton. This is consistent with the initial load behavior.

2. **isLoading branch in pages after loading.tsx is added**
   - What we know: loading.tsx handles the route-transition skeleton. After hydration, `isLoading` is briefly true while fetchGames runs.
   - What's unclear: Does the loading.tsx skeleton persist long enough to cover the fetchGames duration, or does the client component mount and briefly show the `if (isLoading)` branch?
   - Recommendation: Treat the `if (isLoading)` branch as the "in-page skeleton" — render the same skeleton layout as loading.tsx (without the route Suspense machinery). This ensures the user sees consistent skeleton whether loading.tsx fired or the page fetched fresh data post-mount.

---

## Validation Architecture

> nyquist_validation is enabled (config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.3.0 |
| Config file | `jest.config.ts` (exists) |
| Quick run command | `npm test -- --passWithNoTests` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Logout button calls signOut with callbackUrl | manual-only | N/A — requires DOM/browser | N/A |
| UX-02 | Skeleton renders before data loads | manual-only | N/A — requires DOM/browser | N/A |
| UX-03 | Button disabled + Loader2 during submit | manual-only | N/A — requires DOM/browser | N/A |
| UX-04 | Empty state shows when games=[] | manual-only | N/A — requires DOM/browser | N/A |
| UX-05 | Error state + retry on fetch failure | manual-only | N/A — requires DOM/browser | N/A |

**Rationale:** All UX-01 through UX-05 requirements are visual/interactive browser behaviors. The project's Jest config uses `testEnvironment: 'node'` and has no `@testing-library/react` or jsdom setup. Adding those would be new dependencies, which is blocked by the zero-new-deps decision. Automated testing for this phase is not possible without adding jsdom — so all five requirements are manual-only.

**Regression gate:** The existing test suite (lib utilities, API route parse-pdf tests) MUST still pass after all phase changes. Run `npm test` as the phase gate — if existing tests still pass, no regressions were introduced.

### Sampling Rate

- **Per task commit:** `npm test -- --passWithNoTests` (confirms no regression)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure is sufficient for regression checking. No new test files are needed. All UX validation is manual (see table above).

---

## Sources

### Primary (HIGH confidence)

- Direct code audit of `app/dashboard/page.tsx` — confirmed fetchGames, isLoading, error, empty state patterns
- Direct code audit of `app/games/[id]/page.tsx` — confirmed isDeleting, async params pattern
- Direct code audit of `app/games/add/page.tsx` — confirmed isLoading, isImporting, PDF label pattern
- Direct code audit of `app/games/[id]/edit/page.tsx` — confirmed isSaving pattern
- Direct code audit of `app/games/[id]/mental/page.tsx` — confirmed isLoading on mental state
- Direct audit of `package.json` — confirmed lucide-react@0.552.0, next-auth@4.24.13, next@16.0.1, react@19.2.0 all installed
- Direct audit of `app/globals.css` — confirmed Tailwind 4 CSS-first setup (`@import "tailwindcss"`, `@theme inline`)
- Direct audit of `jest.config.ts` — confirmed node testEnvironment, no jsdom

### Secondary (MEDIUM confidence)

- Next.js App Router `loading.tsx` convention: well-documented in Next.js official docs; Suspense boundary wrapping is confirmed behavior in Next.js 13+
- `signOut` callbackUrl behavior: established next-auth v4 pattern; callbackUrl as relative path is the safe cross-environment approach

### Tertiary (LOW confidence)

- `key` prop forcing Suspense re-trigger via loading.tsx: behavior confirmed in community resources and consistent with React Suspense semantics, but not explicitly documented in Next.js official docs for this exact use case

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries confirmed via package.json; all state vars confirmed via code audit
- Architecture: HIGH — loading.tsx, Header.tsx, and Loader2 patterns are straightforward; /games/page.tsx is new but identical to dashboard pattern
- Pitfalls: HIGH — all pitfalls identified from direct code reading (current error state hides header; fetchGames missing setIsLoading(true) on retry; /games/page.tsx doesn't exist)

**Research date:** 2026-07-18
**Valid until:** 2026-08-18 (stable stack — Next.js 16, React 19, lucide-react, next-auth v4 won't change under this project)
