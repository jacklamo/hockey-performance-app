# Phase 6: UX Polish - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Every protected page handles its full lifecycle: the user always knows what is happening, can always leave their session, and is never stranded by a blank screen or a silent failure. This phase adds logout, skeleton loading states, submit button feedback, empty states, and error recovery. No new data features.

</domain>

<decisions>
## Implementation Decisions

### Logout Button
- Shared `Header.tsx` component used on all protected pages: /dashboard, /games, and /games/[id]
- Logout sits top-right of the header as a plain text link ("Logout")
- Header layout: page title on the left, logout link on the right — no nav links
- `signOut` called with explicit `callbackUrl: '/auth/login'` (prevents redirect loop)
- Game detail pages adopt the shared Header; back-link sits below the header as secondary nav
- Header is the first thing built — all other page modifications depend on it

### Skeleton Loading
- `loading.tsx` files (Next.js App Router) for route-level loading UI
- Shimmer skeleton style (animated gradient sweep) — not a centered spinner
- High fidelity: skeleton matches the actual page layout (4 stat cards + chart area + table rows on dashboard)
- `/games/[id]` also uses `loading.tsx` with `key={params.id}` on the page to force remount between game navigations
- `/games` page must be created as part of this phase (doesn't exist yet — required by UX-02/04/05)

### Submit Button Feedback
- Pattern: Loader2 icon (lucide-react, already installed) + text change while submitting
  - "Save" → Loader2 + "Saving..."
  - "Add Game" → Loader2 + "Adding..."
  - "Confirm Delete" → Loader2 + "Deleting..."
  - "Import PDF" → Loader2 + "Importing..."
- Button disabled while submitting to prevent double-submit
- Applied consistently to all form submit buttons: add game, edit game, log mental state, delete (confirm step), PDF import

### Empty States
- Claude's Discretion: specific copy, icon choice, and styling for empty states on /dashboard and /games
- Must include a clear call to action (e.g., "Add Your First Game" link to /games/add)

### Error States
- Claude's Discretion: specific styling for error UI on /dashboard and /games
- Must include a retry button that re-attempts the fetch without a full page refresh (existing `fetchGames` pattern on dashboard is correct; apply same to /games)

### Claude's Discretion
- Skeleton shimmer CSS animation approach (Tailwind animate-pulse or custom keyframes)
- Exact skeleton shape proportions
- Empty state icon/illustration choice
- Error state icon choice
- Copy for empty states and error messages
- Exact color and spacing for the shared Header component

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lucide-react`: Already installed — ArrowLeft, FileText in use. Loader2 and LogOut available without new deps.
- `isLoading`/`isSaving`/`isDeleting`/`isImporting` state variables: Already in each page — need button wiring only, not new state.
- `fetchGames` as `useCallback`: Dashboard already has a retry-able fetch. Same pattern needed for /games page.
- Existing empty state block on dashboard ("No Games Yet"): Can be enhanced; same pattern for /games.
- Existing error block on dashboard with Try Again button: Already correct pattern (calls fetchGames). Style uplift + apply to /games.

### Established Patterns
- All pages are `'use client'` components — no RSC data fetching; loading.tsx provides the skeleton layer before the client component mounts and fetches
- Tailwind CSS 4 utilities only — no component library
- `bg-white rounded-lg shadow-sm border border-gray-200` — the card pattern used consistently across pages
- `bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700` — primary button style
- Async params pattern: `useEffect(() => { params.then(p => setGameId(p.id)); }, [params])` — used in all dynamic route pages

### Integration Points
- Header.tsx: new shared component, imported by dashboard, /games/page.tsx, and /games/[id]/page.tsx
- loading.tsx files: placed at app/dashboard/loading.tsx, app/games/loading.tsx, app/games/[id]/loading.tsx
- /games/page.tsx: new file — full games list page (all games, not just recent 5). Needs its own fetch, loading state, empty state, and error state.
- signOut from 'next-auth/react': already in package.json; no import exists yet in any page

</code_context>

<specifics>
## Specific Ideas

- No specific design references given — standard minimal approach consistent with existing app style
- The existing dashboard "No Games Yet" block is already a reasonable starting point for empty states

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-ux-polish*
*Context gathered: 2026-07-18*
