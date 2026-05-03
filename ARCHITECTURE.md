# Architecture

Project context and conventions. Read this first before making changes.

## What this is

DoNow — a mobile-first React todo app with a GitHub-style activity heatmap as the core engagement mechanic. The app is shaped like a phone screen — full screen on mobile, centered ~420px-wide card on desktop with a soft background.

Four tabs at the bottom: **Today**, **Calendar**, **Streak**, **Profile**. First-time visitors hit a **Login screen** asking for a username (no password). Everything persists in `localStorage`.

## Tech stack

- **React 18** with hooks, no router (single-page tab switcher)
- **Vite** dev server / bundler
- **Tailwind CSS v3** for layout/spacing/typography utilities only
- **lucide-react** for all icons
- **Plus Jakarta Sans** loaded from Google Fonts at runtime via a `useEffect` link injection — the only font, no italics or serifs (user requested)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

## Android wrapper (Capacitor)

The app is wrapped with Capacitor so it ships as a native Android APK. The `android/` folder is a real Android Studio project, committed to the repo; build artifacts (`android/build`, `.gradle`, `local.properties`, etc.) are gitignored by Capacitor's generated `android/.gitignore`.

```bash
npm run build              # rebuild dist/
npx cap sync android       # copy dist/ into android/app/src/main/assets/public
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
# or: npx cap open android
```

App identity (`appId: com.todostreak.app`, `webDir: dist`) is in `capacitor.config.json`. After any React change you must `npm run build && npx cap sync android` before the native build picks it up — there is no hot reload across the WebView boundary.

## File layout

```
src/
├── main.jsx     # React entry, mounts <App />
├── App.jsx      # ALL app code (~1,600 lines, intentionally one file)
└── index.css    # Tailwind directives + box-sizing reset
```

Everything lives in `src/App.jsx`. If it grows past ~2,500 lines, consider splitting subcomponents into `src/components/`. Until then, keep it together — the inline-everything pattern is on purpose, makes the file portable as an artifact.

## Architecture

```
App.jsx
├── storage           # localStorage wrapper matching artifact API shape
├── helpers           # date keys, formatters, constants
├── LIGHT, DARK       # theme palette objects (must have identical keys)
├── TASK_ICONS        # currently unused (kept for fast revert)
├── colorFor()        # task → color (kept for fast revert; not rendered)
├── heatColor()       # count → heatmap stop color
├── ThemeCtx          # React context, passes T to subcomponents
│
├── TodoApp()         # root: loads username/theme/tasks, picks LIGHT or DARK,
│                       conditionally renders LoginScreen or MainApp
├── LoginScreen()     # username-only auth, persists to todo-user-v3
├── MainApp()         # the 4 tabs, modals, FAB, bottom nav — most logic lives here
│
└── subcomponents     # TaskRow, MiniStat, BigStat, NavBtn, EmptyState, Modal,
                        SectionLabel, SettingRow, Toggle
```

The `// ─────` comment dividers separate sections — use them as ripgrep anchors:
`rg "ROOT|LOGIN|MAIN APP|SUBCOMPONENTS" src/App.jsx`

## Theme system

Two palette objects, `LIGHT` and `DARK`, with **identical keys**. `MainApp` and subcomponents pull the active palette from `ThemeCtx` via the `useT()` hook. **Never hardcode hex colors in component bodies** — always go through theme tokens. If adding a new color, add it to both `LIGHT` and `DARK`.

Notable tokens:

- `primary` — accent (currently green: `#10b981` light, `#34d399` dark)
- `primaryGrad` — gradient for FAB and hero cards
- `primaryLight` — tinted bg for active states / icon backplates
- `heatStops` — 5-element array, GitHub's authentic contribution-graph palette
- `taskColors` — array of `{bg, fg}` pairs (currently unused; icons were removed but kept for revert)
- `pageBg` — outer page color (light: soft mint, dark: pure `#000000` for OLED)
- `surface`, `surfaceAlt`, `surfaceAlt2` — card surfaces in 3 elevations

Theme persists under `todo-theme-v3`. Toggle lives in Profile → Settings.

## Storage

`localStorage` wrapper at top of `App.jsx` mimics the async `{value} | null` shape from the artifact's `window.storage` so the rest of the code is unchanged. Three keys, all suffixed `-v3` so a future schema change can ship with `-v4` without breaking existing users:

- `todo-user-v3` → `{ name, memberSince }` (ISO timestamp)
- `todo-theme-v3` → `"light" | "dark"`
- `todo-tasks-v3` → `Task[]`

```ts
type Task = {
  id: string;          // `${Date.now()}-${random}`
  text: string;
  date: string;        // YYYY-MM-DD (the day it's scheduled FOR)
  completed: boolean;
  completedAt: string | null;  // ISO string of completion moment
  createdAt: string;   // ISO string
};
```

`date` and `completedAt` mean different things. `date` = the day the task belongs to (calendar slot). `completedAt` = exact moment the user checked it off. The heatmap colors days by `completedAt`, not `date`.

## Heatmap

Single `useMemo` in `MainApp` computes a 27-week × 7-day grid ending today. Today tab shows last 16 columns (`heatmap.grid.slice(-16)`); Streak tab shows all 27 with month/day labels.

Color thresholds in `heatColor(count, isFuture, T)`:
- 0 tasks → `heatStops[0]` (gray)
- 1 → `heatStops[1]`
- 2–3 → `heatStops[2]`
- 4–5 → `heatStops[3]`
- 6+ → `heatStops[4]` (most vivid)

Future days return `'transparent'`. Each cell is one calendar day. Tile size: 15px on Today, 11px on Streak.

## Conventions to keep

1. **Tailwind for utility, theme tokens for color.** Use `className` for layout/spacing/typography sizes; use `style={{ color: T.text, background: T.surface }}` for anything color-related.

2. **Custom CSS via injected `<style>` tag** in `MainApp`'s `useEffect`. Hover/transition rules use the `.tdo-` prefix. This is intentional — keeps the file self-contained and avoids needing arbitrary Tailwind values that a JIT compiler isn't always available for.

3. **Modals are absolute-positioned inside the phone card**, not portaled to body. Closes via overlay click; Escape key handled per-modal.

4. **The FAB shows on Today and Calendar only** (`tab === 'today' || tab === 'calendar'`). Don't add it to Streak/Profile — there's nothing to add from those screens.

5. **Don't reintroduce category icons in `TaskRow`** — user explicitly removed them. The infrastructure (`TASK_ICONS`, `colorFor`) is kept for fast revert if asked, but rendering is gone.

6. **No italics, no serif fonts.** User shut these down. Plus Jakarta Sans only.

7. **Single font, no font-stacks per element.** The injected style sets it on `.tdo-root *` once.

8. **Date keys are local-time** (`dateToKey` uses `getFullYear/Month/Date`, not UTC). This matters because users in IST who complete tasks at 11pm should see them on the right day.

## Known structural details

- The phone card uses `height: 100vh` + `overflow: hidden` and the bottom nav is `absolute bottom-0`. The FAB is also absolute, positioned `right: 18, bottom: 84`. If you change the nav height, update the FAB's `bottom` value to keep ~20px clearance.
- The big "TODO" watermark behind the card is `position: absolute` on the page bg, hidden below 640px width.

## Common future requests (pre-thought-through)

- **Edit task text** → add a third button to `TaskRow` next to delete, or open a small modal on tap. Reuse the existing `Modal` and input pattern from `showAdd`.
- **Categories** → revive `TASK_ICONS` + `colorFor`, add a category picker in the add-task modal, store on `Task`.
- **Recurring tasks** → add a `recurrence` field; on app load, expand recurring tasks into concrete dates within a window (e.g., next 90 days) and write them back.
- **Export / import** → JSON dump of the three storage keys; import via file input.
- **PWA** → add `vite-plugin-pwa`; the layout already works fullscreen.
- **Sync across devices** → would need a backend (Supabase, Firebase, or a tiny Express + SQLite). The storage wrapper at the top is the only place to swap.

## Things to avoid

- Don't reach for `localStorage` directly anywhere except inside the `storage` wrapper. If you need a new key, version it (`-v3` suffix) and add it to the README's storage-keys list.
- Don't add CSS-in-JS libraries. The current inline-style + injected-stylesheet approach is small and consistent.
- Don't pull in a date library (date-fns, dayjs) for the helpers at the top — they're 5 lines of native `Date`. If date handling grows complex (recurring, timezones), revisit then.
- Don't add a router. The tab system is state-driven on purpose; the app is a single screen.

## Sanity checks before shipping a change

```bash
npm run build          # must pass
# eyeball: login → add 3 tasks → check 2 → switch tabs → toggle theme → reload
```

The reload step matters — it's the only way to verify localStorage round-trips correctly.
