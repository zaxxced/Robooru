/**
 * Capacitor Bridge and Platform Utilities
 * Provides seamless fallbacks when running in standard web preview vs native Android APK
 */

export const isNative = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor && 
         typeof window.Capacitor.isNativePlatform === 'function' && 
         window.Capacitor.isNativePlatform();
};

export const getPlugins = () => {
  return window.Capacitor?.Plugins || {};
};

const GELBOORU_REFERER = 'https://gelbooru.com/';
const IMAGE_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', avif: 'image/avif'
};

// Fetch an image through the native HTTP layer (sends a Gelbooru Referer), return a data URL
const fetchImageAsDataUrl = async (url) => {
  const plugins = getPlugins();
  if (!isNative() || !plugins.CapacitorHttp) throw new Error('native http unavailable');
  const res = await plugins.CapacitorHttp.get({
    url,
    responseType: 'blob',
    headers: {
      'Referer': GELBOORU_REFERER,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) BooruBrowser/1.0',
      'Accept': 'image/*,*/*;q=0.8'
    }
  });
  if (res.status && res.status >= 400) throw new Error(`HTTP ${res.status}`);
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  return `data:${IMAGE_MIME[ext] || 'image/jpeg'};base64,${res.data}`;
};

/**
 * Load an image robustly:
 * 1) direct load with no Referer (many CDNs block the foreign https://localhost referer)
 * 2) if that fails on Android, fetch natively with a Gelbooru Referer and show as data URL
 * 3) if that fails too, try the next URL in the list
 */
export const setImageSrc = (img, urls, { onLoad, onFail } = {}) => {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  const token = Symbol('img');
  img._srcToken = token;
  const alive = () => img._srcToken === token;

  let idx = 0;
  let nativeTried = false;
  img.referrerPolicy = 'no-referrer';

  const tryNextUrl = () => {
    if (!alive()) return;
    nativeTried = false;
    idx++;
    if (idx < list.length) {
      img.src = list[idx];
    } else if (onFail) {
      onFail();
    }
  };

  img.onload = () => {
    if (alive() && onLoad) onLoad();
  };

  img.onerror = async () => {
    if (!alive()) return;
    const isData = (img.src || '').startsWith('data:');
    if (!nativeTried && !isData && isNative()) {
      nativeTried = true;
      try {
        const dataUrl = await fetchImageAsDataUrl(list[idx]);
        if (alive()) img.src = dataUrl;
        return;
      } catch (err) {
        console.warn('Native image fetch failed:', list[idx], err);
      }
    }
    tryNextUrl();
  };

  if (list.length) {
    img.src = list[0];
  } else if (onFail) {
    onFail();
  }
};

// Haptics feedback
export const Haptics = {
  impact: async (style = 'LIGHT') => {
    try {
      const plugins = getPlugins();
      if (plugins.Haptics) {
        await plugins.Haptics.impact({ style });
      } else if (navigator.vibrate) {
        navigator.vibrate(style === 'HEAVY' ? 40 : 15);
      }
    } catch {
      // Ignore vibration error
    }
  },
  selection: async () => {
    try {
      const plugins = getPlugins();
      if (plugins.Haptics) {
        await plugins.Haptics.selectionChanged();
      } else if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore
    }
  },
  notification: async (type = 'SUCCESS') => {
    try {
      const plugins = getPlugins();
      if (plugins.Haptics) {
        await plugins.Haptics.notification({ type });
      } else if (navigator.vibrate) {
        navigator.vibrate([15, 30, 20]);
      }
    } catch {
      // Ignore
    }
  }
};

// Hardware Back Button Handler
export const BackButton = {
  stack: [],
  init: () => {
    const plugins = getPlugins();
    if (plugins.App) {
      plugins.App.addListener('backButton', ({ canGoBack }) => {
        BackButton.handleBack(canGoBack);
      });
    }
    // Also bind standard escape or popstate for web testing
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        BackButton.handleBack(false);
      }
    });
  },
  push: (id, callback) => {
    // Remove if already in stack
    BackButton.stack = BackButton.stack.filter(item => item.id !== id);
    BackButton.stack.push({ id, callback });
  },
  remove: (id) => {
    BackButton.stack = BackButton.stack.filter(item => item.id !== id);
  },
  handleBack: (canGoBack) => {
    if (BackButton.stack.length > 0) {
      const top = BackButton.stack.pop();
      try {
        top.callback();
      } catch (err) {
        console.error('Back button handler error:', err);
      }
      return;
    }

    const plugins = getPlugins();
    if (plugins.App && !canGoBack) {
      plugins.App.exitApp();
    }
  }
};

// Status Bar Styling
export const setStatusBarTheme = async (isDark = true, color = '#12141a') => {
  try {
    const plugins = getPlugins();
    if (plugins.StatusBar) {
      await plugins.StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
      await plugins.StatusBar.setBackgroundColor({ color });
    }
  } catch {
    // Web fallback ignored
  }
};

// Share Link / Image
export const shareMedia = async ({ title, text, url }) => {
  try {
    const plugins = getPlugins();
    if (plugins.Share) {
      await plugins.Share.share({
        title: title || 'Booru Post',
        text: text || '',
        url: url || '',
        dialogTitle: 'Share Booru Post',
      });
      return true;
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
      return true;
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      return 'clipboard';
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Share error:', err);
    }
  }
  return false;
};

// Download Media File
export const downloadMedia = async (url, filename, onProgress) => {
  try {
    // Preferred on Android: hand the file to the system DownloadManager (see native/MainActivity.java).
    // It streams natively, shows a notification, and saves into Pictures/Booru.
    if (isNative() && window.BooruNative && typeof window.BooruNative.download === 'function') {
      if (onProgress) onProgress(50, 'Starting download...');
      if (window.BooruNative.download(url, filename)) {
        if (onProgress) onProgress(100, 'Saving to Pictures/Booru (see notification)');
        return true;
      }
    }

    if (onProgress) onProgress(10, 'Initiating download...');

    // In Native Android Capacitor:
    const plugins = getPlugins();
    if (isNative() && plugins.Filesystem) {
      if (onProgress) onProgress(30, 'Downloading to storage...');
      
      // Fetch data using CapacitorHttp
      let base64Data = '';
      if (plugins.CapacitorHttp) {
        const resp = await plugins.CapacitorHttp.get({
          url: url,
          responseType: 'blob',
          headers: {
            'Referer': GELBOORU_REFERER,
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) BooruBrowser/1.0'
          }
        });
        base64Data = resp.data;
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }

      if (onProgress) onProgress(80, 'Saving to Pictures/Booru...');

      // Save to external storage / Pictures
      await plugins.Filesystem.writeFile({
        path: `Pictures/Booru/${filename}`,
        data: base64Data,
        directory: 'EXTERNAL_STORAGE',
        recursive: true
      });

      if (onProgress) onProgress(100, 'Saved to Pictures/Booru!');
      return true;
    }

    // Web Fallback: Fetch blob and trigger download attribute
    if (onProgress) onProgress(40, 'Downloading file...');
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    
    if (onProgress) onProgress(85, 'Saving file...');
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 15000);

    if (onProgress) onProgress(100, 'Download complete!');
    return true;
  } catch (err) {
    console.error('Download error:', err);
    // If CORS fails on web fallback, open in new tab
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = filename;
    a.click();
    if (onProgress) onProgress(100, 'Opened link in browser');
    return true;
  }
};
