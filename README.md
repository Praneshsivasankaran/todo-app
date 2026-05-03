# Todo · Streak

A minimal todo app with a GitHub-style activity heatmap, calendar, profile, and dark/light themes. Mobile-first design that also works as a centered card on desktop.

## Features

- **Today** — daily task list with checkboxes and a compact streak heatmap preview
- **Calendar** — month grid with task indicators on each day; tap to view/add tasks for any date
- **Streak** — full 6-month GitHub-style heatmap, current/longest streak, and lifetime stats
- **Profile** — your stats and settings (theme toggle, edit username, log out)
- **Floating + button** — primary action for adding tasks
- **Persistent** — everything stored in `localStorage`; survives reloads
- **Light & Dark themes** — clean light theme + true OLED-black dark theme

## Tech

- React 18
- Vite
- Tailwind CSS v3
- lucide-react (icons)
- Plus Jakarta Sans (Google Fonts, loaded at runtime)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

## Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

The production build outputs to `dist/`.

## Deploy

The `dist/` folder is a static site — drop it on Vercel, Netlify, GitHub Pages, Cloudflare Pages, or any static host.

**Vercel:** `vercel deploy` from the project root, or connect the repo on vercel.com.

**Netlify:** `netlify deploy --prod --dir=dist`, or connect the repo with build command `npm run build` and publish directory `dist`.

## Android (APK)

The app is wrapped with [Capacitor](https://capacitorjs.com/) so it can ship as a native Android APK. The `android/` folder is a real Android Studio project and is committed to the repo; build artifacts under `android/build`, `android/.gradle`, etc. are gitignored.

```bash
# 1. Build the web bundle and copy it into the Android project
npm run build
npx cap sync android

# 2. Build a debug APK from the command line (requires JDK 17/21 + Android SDK)
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk

# Or open the project in Android Studio and hit Run
npx cap open android
```

After editing React code, rerun `npm run build && npx cap sync android` to push the new bundle into the native shell.

App identity (`appId`, `appName`, `webDir`) lives in `capacitor.config.json` at the project root.

## Project structure

```
todo-app/
├── index.html              # Vite root HTML
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # All app logic + components
    └── index.css           # Tailwind directives
```

## Storage keys

Data lives under these `localStorage` keys (clear them to reset):

- `todo-user-v3` — username + member-since timestamp
- `todo-theme-v3` — `"light"` or `"dark"`
- `todo-tasks-v3` — task list JSON

## Customization

- **Accent color** — edit the `LIGHT` and `DARK` palette objects at the top of `src/App.jsx`. The primary color flows through the gradient, FAB, streak hero, and active states.
- **Heatmap colors** — `LIGHT.heatStops` and `DARK.heatStops` are 5-stop arrays (empty → most active). Currently uses GitHub's official contribution-graph palette.
- **Heatmap thresholds** — see the `heatColor()` function. Currently: 0 / 1 / 2–3 / 4–5 / 6+ tasks per day.
- **Heatmap range** — Today shows last 16 weeks (`.slice(-16)`); Streak shows 27 weeks (controlled by `cols` inside the `heatmap` `useMemo`).
