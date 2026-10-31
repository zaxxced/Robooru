# Yoibooru (Unofficial Gelbooru Client)

A fast, lightweight, and modern unofficial Gelbooru client for Android and Web. Inspired by the architecture of [Mori](https://github.com/coflyn/Mori): built with **Vanilla JS + HTML5 + CSS3**, no heavy frameworks.

The app ships in two flavors that share the same web UI:

- **Kotlin native shell (`native-android/`, branch `feat/kotlin-native-ui`)**: a plain Android `WebView` app written in Kotlin. Images are streamed natively with the right Referer, downloads go through Android's `DownloadManager`, and the UI is loaded from bundled assets.
- **Capacitor build (`public/` + `native/`)**: the original Capacitor wrapper, still available for web preview and the classic APK pipeline.

---

## Features

- **Masonry Grid**: Smooth 1 to 4 column responsive masonry layout with pull-to-refresh and previous/next **page controls** at the bottom. Cards are added in small batches per frame and the first visible thumbnails load with high priority, so the grid shows up top to bottom on slower connections.
- **Debounced Search & Autocomplete**: Real-time Gelbooru tag suggestions with category coloring (artist, copyright, character, general, metadata), post count indicators, active tag chips with negation (`-tag`), and recent / saved searches.
- **Rating & Sort Filters**: Quick filter chips for `rating:general`, `rating:sensitive`, `rating:questionable`, `rating:explicit`, sort tags (`sort:score`, `sort:id:desc`), and negation. A rating typed in the search always wins over the one in Settings.
- **Fullscreen Media Viewer**:
  - Fluid swipe navigation between posts.
  - Smooth pinch-to-zoom, pan, and double-tap zoom.
  - Swipe down gesture to dismiss.
  - Fast sample image first with one-tap "Load Original" button (or always-original, depending on the Image Quality setting).
  - Video support (`.mp4`, `.webm`) with responsive controls.
  - Intelligent background preloading of adjacent images (skipped when Data Saver is on).
  - Posts you have already downloaded open from the local file instead of the network.
- **Categorized Tag Details Sheet**: Tap the info button on a post to see score, dimensions, rating, uploader, source, and parent/child relations. Tags are grouped in a fixed order with a colored header and a tag count per group:

  | Group | Color |
  |---|---|
  | Artist | Red |
  | Copyright | Purple |
  | Character | Green |
  | General | Blue |
  | Metadata | Orange |

  Single-tap a tag to search it; long-press to add it to the exclusion list (`-tag`). Categories are resolved for **every** tag on the post, not just the first 50: tags are looked up in batches through the Gelbooru tag API (with your API credentials), and any tag that still has no category is resolved one by one through the autocomplete endpoint and moved into its proper group as soon as the answer arrives.
- **Local Favorites & Collections**: Organize bookmarked posts into custom folders/collections. Export and import collections via JSON.
- **Downloads Tab**: A floating downloads button with live progress, a "Recent downloads" swipeable carousel, and a full list of downloaded files. Tapping an entry reopens the post in the viewer. Completed downloads can be cleared with one tap.
- **Direct Downloads & Sharing**: Save high-resolution originals to `Pictures/Booru/` through Android's `DownloadManager` (with a system notification and a progress indicator in the app), and share using the native Android share sheet.
- **Tag Blacklist**: Automatically exclude unwanted content tags across all feeds and search queries.
- **Content Controls & Age Gate**: Mandatory 18+ content disclaimer on first launch, a content rating filter in Settings, and an optional NSFW blur toggle with tap-to-reveal.

  | Setting | What is sent to Gelbooru |
  |---|---|
  | General Only (Safe) | `rating:general` |
  | General + Sensitive (Default) | `-rating:questionable -rating:explicit` |
  | Unrestricted (All Ratings) | no rating tag |
- **Optional 4-Digit PIN Lock**: Protect app privacy upon launch.
- **Personalized Themes**: Dark (Charcoal), AMOLED (Pure Pitch Black), and Light modes with customizable vibrant accent colors (violet, cyan, emerald, rose, amber, blue).
- **Data Saver & Image Quality**: Choose sample or original images, and turn off preloading to save mobile data.
- **Dual Language**: Full English and Indonesian (Bahasa Indonesia) internationalization.
- **Hardware Back Button**: Smooth handling on Android to close open sheets, viewer, or modals, and to return to the browse tab before exiting.

---

## What's New in the Kotlin Native Build

The `feat/kotlin-native-ui` branch replaces the Capacitor runtime with a small native shell (`native-android/`):

- **Native image streaming**: Requests to `gelbooru.com` are intercepted in `shouldInterceptRequest` and fetched with a Gelbooru Referer and a proper User-Agent. Plain images are streamed through a pipe on a pool of 6 threads, so a slow or stuck image never blocks the rest of the grid. API calls and Range requests (video) use a separate blocking path that keeps their exact headers.
- **Bundled assets via `WebViewAssetLoader`**: The UI is served from `https://localhost/assets/www/index.html`, with file access disabled.
- **`BooruNative` JavaScript bridge**: `download`, `downloadProgress`, `getDownloadedFileUrl`, `share`, `exitApp`, and `setStatusBarColor`, with web fallbacks when the bridge is not present.
- **Local file playback**: Finished downloads are served back to the WebView through `https://localhost/downloads/<id>`, so they open instantly and offline.
- **External links** open in the system browser; only `localhost` and `gelbooru.com` stay inside the app.
- **Native polish**: Rounded cards and sheets, blurred header and navigation bar, no overscroll glow, and a themed status bar that follows the selected theme.
- **Launcher icon and branding** under `native-android/branding/` and the `mipmap-*` resources.

Recent fixes and improvements:

- Tag details sheet: new group order, colored headers with tag counts, and complete category lookup (see Features).
- Rating filter fix: the Settings values `safe` / `standard` / `all` are now mapped to real Gelbooru rating tags. Previously `rating:standard` was sent as-is, which returned zero results when API credentials were set.
- Gelbooru now requires API credentials on API requests, so the tag lookup sends your User ID and API Key too.
- Downloads: progress is read from `DownloadManager`, completed files are linked to their post, and the History tab became a Downloads tab with a recent carousel.
- Gallery: page-based browsing with previous/next controls, and batched card rendering for smoother first paint.

---

## Building the Android APK (CI / GitHub Actions)

You do not need to install Android Studio or Gradle locally! You can build the APK directly in the cloud using GitHub Actions. There are two workflows:

| Workflow | Builds | Triggers |
|---|---|---|
| **Build Kotlin Native APK** (`build-kotlin-apk.yml`) | `native-android/` (Kotlin shell) | Manual run, or push to `feat/kotlin-native-ui` touching `native-android/**` |
| **Build Android APK** (`build-apk.yml`) | Capacitor project from `public/` | Push / PR to `main` or `master`, version tags (`v*`), or manual run |

1. **Push this repository to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Yoibooru"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **Trigger the Build**:
   - In your GitHub repository, click on the **Actions** tab at the top.
   - For the Kotlin build, pick **Build Kotlin Native APK** and click **Run workflow** (or just push to `feat/kotlin-native-ui`).
   - For the Capacitor build, **Build Android APK** runs automatically on push to `main`.

3. **Download the APK**:
   - Once the workflow finishes (green checkmark, ~2-3 minutes), click on the completed run.
   - Scroll down to the **Artifacts** section at the bottom of the page.
   - Download **`boorubrowser-kotlin-native-debug-apk`** (Kotlin) or **`boorubrowser-debug-apk`** (Capacitor) and extract `app-debug.apk`.
   - Pushing a `v*` tag also attaches the Capacitor APK to a GitHub Release.

4. **Install on your Android Phone**:
   - Transfer `app-debug.apk` to your phone (or download directly via your phone's browser).
   - Tap the APK file to install.
   - If prompted, tap **Settings** and enable **"Allow from this source"** (or Allow Unknown Sources) to permit installation.
   - Open **Yoibooru** and enjoy!

> The Kotlin build uses JDK 17, Gradle 8.11.1, Android Gradle Plugin 8.9.2, Kotlin 2.0.21, `compileSdk`/`targetSdk` 35, and `minSdk` 26 (Android 8.0+).

---

## Local Development & Testing

### Web Preview Mode
Run the local development server with live reload and Gelbooru CORS proxy:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The dev server serves `public/` and proxies `/api/gelbooru` to `gelbooru.com`.

### Local Kotlin Build (Optional)
If you have the Android SDK (platform 35, build-tools 35.0.0) and Gradle 8.11+ installed:
```bash
cd native-android
gradle assembleDebug
```
The APK is written to `native-android/app/build/outputs/apk/debug/app-debug.apk`. You can also open the `native-android/` folder in Android Studio and click **Run 'app'**.

### Local Capacitor Build (Optional)
```bash
# Add Android platform
npx cap add android

# Sync web assets to Android
npm run cap:sync

# Open project in Android Studio
npm run cap:open
```

### Keeping the Web Assets in Sync
The web UI exists twice: `public/` (web preview and Capacitor) and `native-android/app/src/main/assets/www/` (Kotlin shell). When you change a UI file, apply the same change to both. A few files intentionally differ because the Kotlin shell has its own download and image handling (`api.js`, `capacitor.js`, `downloads.js`, `gallery.js`, `viewer.js`, `i18n.js`, `index.html`, `gallery.css`).

---

## Architecture Overview

```
├── .github/workflows/
│   ├── build-apk.yml            # Cloud CI for the Capacitor APK
│   └── build-kotlin-apk.yml     # Cloud CI for the Kotlin native APK
├── capacitor.config.json        # Capacitor configuration with CapacitorHttp enabled
├── native/
│   └── MainActivity.java        # Capacitor build: image proxy + DownloadManager bridge
├── native-android/              # Kotlin native shell (WebView)
│   ├── build.gradle.kts         # Plugin versions (AGP, Kotlin)
│   ├── settings.gradle.kts
│   ├── branding/                # Icon source
│   └── app/
│       ├── build.gradle.kts     # SDK levels, versionName, dependencies
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── java/com/example/boorubrowser/MainActivity.kt
│           │                    # WebView, request interception, image streaming, BooruNative bridge
│           ├── res/             # Launcher icons
│           └── assets/www/      # Bundled copy of the web UI (same layout as public/)
│               └── css/native-polish.css, download-carousel.css
├── public/                      # Pure Vanilla Web Application
│   ├── index.html               # Main SPA layout & modals
│   ├── css/
│   │   ├── variables.css        # Colors, tag category palette, AMOLED/Dark/Light themes, safe-area tokens
│   │   ├── base.css             # Reset, typography, layout, scrollbar styling
│   │   ├── components.css       # Buttons, chips, badges, inputs, skeletons, toasts
│   │   ├── gallery.css          # Masonry grid, cards, page controls, pull-to-refresh
│   │   ├── viewer.css           # Fullscreen media viewer, zoom transforms, gesture overlay
│   │   ├── settings.css         # Settings layout, toggles, PIN keypad, bottom sheet, tag group headers
│   │   └── download-carousel.css# Recent downloads carousel
│   └── js/
│       ├── app.js               # Core app controller & navigation router
│       ├── api.js               # Gelbooru API client (posts, autocomplete, tag categories, rating mapping)
│       ├── store.js             # IndexedDB storage (favorites, collections, searches, config)
│       ├── utils/
│       │   ├── capacitor.js     # Haptics, share, back button, status bar, downloads, resilient image loading
│       │   ├── i18n.js          # English & Indonesian localization dictionary
│       │   └── gestures.js      # Touch swipe, pinch-to-zoom, pan, pull-to-refresh
│       └── ui/
│           ├── gallery.js       # Masonry layout, page controls, batched rendering
│           ├── search.js        # Autocomplete, tag categories, recent & saved searches
│           ├── viewer.js        # Fullscreen viewer with zoom, swipe, video controls
│           ├── sheet.js         # Categorized tag bottom sheet with tap/hold actions
│           ├── favorites.js     # Collections manager, JSON export/import
│           ├── downloads.js     # Floating download manager, recent carousel, downloads tab
│           ├── history.js       # Combined view/download history list (not currently wired into app.js)
│           ├── settings.js      # User configuration, API keys, blacklists, themes
│           └── gate.js          # 18+ Age disclaimer gate & 4-digit PIN verification
├── package.json                 # NPM dependencies & helper scripts
└── vite.config.ts               # Web server configuration with proxy for Gelbooru API
```

---

## Gelbooru API Credentials

Gelbooru now requires an API Key and User ID on API requests, so set them up before first use:
1. Obtain your API Key and User ID from your Gelbooru account options page.
2. Go to **Settings** in Yoibooru.
3. Paste your **User ID** and **API Key**, then tap **Save & Test**.

The credentials are stored only on your device and are sent to Gelbooru with post and tag requests.

---

## Disclaimer

This is an **unofficial client** and is **not affiliated with, endorsed by, or sponsored by Gelbooru**. All media and tags are served directly from Gelbooru servers.
