# DoNow

A todo app I built because every other one I tried either nagged me about productivity or had a subscription. This one just lets you check things off and gives you a green-square heatmap like GitHub commits — turns out staring at an empty grid is a pretty good motivator.

Four tabs: today's list, a calendar to schedule stuff for later, a big streak heatmap with your stats, and a profile screen. Mobile-first (it's basically phone-shaped), but it also works fine on desktop as a centered card. Everything lives in `localStorage`, so no accounts, no servers, nothing leaves your browser.

## Running it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. First load asks for a username (no password, just a name to greet you with).

To build for the web:

```bash
npm run build      # output ends up in dist/
```

`dist/` is just a static folder — host it anywhere that serves files (Vercel, Netlify, GitHub Pages, your own server, whatever).

## Android

I wrapped it with [Capacitor](https://capacitorjs.com/) so it can run as a real Android app. The `android/` folder is a normal Android Studio project, committed to the repo.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK ends up at `android/app/build/outputs/apk/debug/app-debug.apk`. Needs JDK 17 or 21 and the Android SDK installed. Or just run `npx cap open android` and hit Run in Android Studio.

If you change React code, you have to rebuild and re-sync before the Android shell sees the new bundle — there's no hot reload across the WebView boundary.

## Stack

React 18, Vite, Tailwind v3 (utilities only — colors are theme tokens, not hardcoded), lucide-react for icons, Plus Jakarta Sans for the font. The whole app fits in one `src/App.jsx` file on purpose, makes it easy to fork and tweak.

## Notes

- All your data is in three `localStorage` keys (`todo-user-v3`, `todo-theme-v3`, `todo-tasks-v3`). Clear them in DevTools to reset.
- Dark mode is true `#000000` because OLED screens deserve it.
- Tabs use state, not a router. There's only one screen.
- See `ARCHITECTURE.md` if you want the full tour of how things fit together.
