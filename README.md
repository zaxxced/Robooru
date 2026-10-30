# BooruBrowser (Unofficial Gelbooru Client)

A fast, lightweight, and modern unofficial Gelbooru client for Android and Web. Inspired by the architecture of [Mori](https://github.com/coflyn/Mori): built with **Vanilla JS + HTML5 + CSS3** in `public/`, wrapped with **Capacitor** for native Android performance without the overhead of heavy frameworks.

---

## Features

- **Masonry Grid**: Smooth 1 to 4 column responsive masonry layout with infinite scroll and pull-to-refresh.
- **Debounced Search & Autocomplete**: Real-time Gelbooru tag suggestions with category coloring (artist, character, copyright, metadata, general), post count indicators, and quick filter chips.
- **Rich Tag Navigation**: Filter by `rating:general`, `rating:sensitive`, `rating:questionable`, `rating:explicit`, sort tags (`sort:score`, `sort:id:desc`), and negation (`-tag`).
- **Fullscreen Media Viewer**:
  - Fluid swipe navigation between posts.
  - Smooth pinch-to-zoom, pan, and double-tap zoom.
  - Swipe down gesture to dismiss.
  - Fast sample image first with one-tap "Load Original" button.
  - Video support (`.mp4`, `.webm`) with responsive controls.
  - Intelligent background preloading of adjacent images.
- **Categorized Bottom Sheet**: View complete post details (score, dimensions, source, rating, uploader) with tags grouped by category. Single-tap to search a tag; long-press to add to exclusion blacklist (`-tag`).
- **Local Favorites & Collections**: Organize bookmarked posts into custom folders/collections. Export and import collections via JSON.
- **History Tracker**: Local history log of recently viewed posts with easy clearing.
- **Direct Downloads & Sharing**: Save high-resolution originals directly to your Android device (`Pictures/Booru/` folder) with progress indicator, and share using native Android share sheet.
- **Tag Blacklist**: Automatically exclude unwanted content tags across all feeds and search queries.
- **Content Controls & Age Gate**: Mandatory 18+ content disclaimer on first launch, customizable rating filter, and optional NSFW blur toggle with tap-to-reveal.
- **Optional 4-Digit PIN Lock**: Protect app privacy upon launch.
- **Personalized Themes**: Dark (Charcoal), AMOLED (Pure Pitch Black), and Light modes with customizable vibrant accent colors.
- **Dual Language**: Full English and Indonesian (Bahasa Indonesia) internationalization.
- **Bypass CORS with CapacitorHttp**: Native HTTP bridge enabled in `capacitor.config.json` for reliable Android API access without web restrictions.
- **Hardware Back Button**: Smooth handling on Android to close open sheets, viewer, or modals before exiting.

---

## Building the Android APK (CI / GitHub Actions)

You do not need to install Android Studio or Gradle locally! You can build the APK directly in the cloud using GitHub Actions:

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of BooruBrowser"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Trigger the Build**:
   - In your GitHub repository, click on the **Actions** tab at the top.
   - You will see the workflow **Build Android APK** running automatically on push.
   - You can also trigger it manually anytime by clicking **Run workflow**.

3. **Download the APK**:
   - Once the workflow finishes (green checkmark, ~2-3 minutes), click on the completed run.
   - Scroll down to the **Artifacts** section at the bottom of the page.
   - Download the **`boorubrowser-debug-apk`** zip file and extract `app-debug.apk`.

4. **Install on your Android Phone**:
   - Transfer `app-debug.apk` to your phone (or download directly via your phone's browser).
   - Tap the APK file to install.
   - If prompted, tap **Settings** and enable **"Allow from this source"** (or Allow Unknown Sources) to permit installation.
   - Open **BooruBrowser** and enjoy!

---

## Local Development & Testing

### Web Preview Mode
Run the local development server with live reload and Gelbooru CORS proxy:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Local Android Build with Capacitor CLI (Optional)
If you have Android Studio & Android SDK installed locally:
```bash
# Add Android platform
npx cap add android

# Sync web assets to Android
npm run cap:sync

# Open project in Android Studio
npm run cap:open
```
In Android Studio, click **Run 'app'** or select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## Architecture Overview

```
├── .github/workflows/
│   └── build-apk.yml        # Cloud CI for compiling Android APK
├── capacitor.config.json    # Capacitor configuration with CapacitorHttp enabled
├── public/                  # Pure Vanilla Web Application
│   ├── index.html           # Main SPA layout & modals
│   ├── css/
│   │   ├── variables.css    # Colors, AMOLED/Dark/Light themes, safe-area tokens
│   │   ├── base.css         # Reset, typography, layout, scrollbar styling
│   │   ├── components.css   # Buttons, chips, badges, inputs, skeletons, toasts
│   │   ├── gallery.css      # Masonry grid, cards, aspect ratios, pull-to-refresh
│   │   ├── viewer.css       # Fullscreen media viewer, zoom transforms, gesture overlay
│   │   └── settings.css     # Settings layout, toggles, PIN keypad, bottom sheet
│   └── js/
│       ├── app.js           # Core app controller & navigation router
│       ├── api.js           # Gelbooru API client (CapacitorHttp + web proxy fallback)
│       ├── store.js         # IndexedDB storage (favorites, history, collections, config)
│       ├── utils/
│       │   ├── capacitor.js # Wrappers for Haptics, Filesystem, Share, BackButton
│       │   ├── i18n.js      # English & Indonesian localization dictionary
│       │   └── gestures.js  # Touch swipe, pinch-to-zoom, pan, pull-to-refresh
│       └── ui/
│           ├── gallery.js   # Masonry layout, infinite scroll, DOM recycling
│           ├── search.js    # Autocomplete, tag categories, recent & saved searches
│           ├── viewer.js    # Fullscreen viewer with zoom, swipe, video controls
│           ├── sheet.js     # Categorized tag bottom sheet with tap/hold actions
│           ├── favorites.js # Collections manager, JSON export/import
│           ├── history.js   # History list and clearing
│           ├── settings.js  # User configuration, API keys, blacklists, themes
│           └── gate.js      # 18+ Age disclaimer gate & 4-digit PIN verification
├── package.json             # NPM dependencies & helper scripts
└── vite.config.ts           # Web server configuration with proxy for Gelbooru API
```

---

## Gelbooru API Credentials

BooruBrowser works out-of-the-box for public browsing. For higher rate limits or accessing user-specific booru features:
1. Obtain your API Key and User ID from your Gelbooru account profile settings.
2. Go to **Settings** in BooruBrowser.
3. Paste your **User ID** and **API Key**, then tap **Save & Test**.

---

## Disclaimer

This is an **unofficial client** and is **not affiliated with, endorsed by, or sponsored by Gelbooru**. All media and tags are served directly from Gelbooru servers.
