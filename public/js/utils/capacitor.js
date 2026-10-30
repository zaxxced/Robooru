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
          responseType: 'blob'
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
