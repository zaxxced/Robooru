/**
 * Main Application Coordinator
 * Connects controllers, handles bottom navigation, toast messages, and back button routing
 */

import { initDB, loadSettings } from './store.js';
import { Haptics, BackButton, setStatusBarTheme } from './utils/capacitor.js';
import { setLanguage, applyI18nToDOM } from './utils/i18n.js';
import { GateController } from './ui/gate.js';
import { BottomSheetController } from './ui/sheet.js';
import { ViewerController } from './ui/viewer.js';
import { GalleryController } from './ui/gallery.js';
import { SearchController } from './ui/search.js';
import { FavoritesController } from './ui/favorites.js';
import { HistoryController } from './ui/history.js';
import { SettingsController } from './ui/settings.js';

class App {
  constructor() {
    this.currentTab = 'browse';
    this.settings = {};
    this.downloadBubbleTimeout = null;
  }

  async init() {
    console.log('Initializing BooruBrowser...');

    // 1. Initialize IndexedDB
    await initDB();

    // 2. Load Settings
    this.settings = await loadSettings();

    // 3. Apply Theme, Accent, and Language
    document.documentElement.setAttribute('data-theme', this.settings.theme || 'dark');
    document.documentElement.setAttribute('data-accent', this.settings.accent || 'violet');
    setLanguage(this.settings.language || 'en');
    const isDark = this.settings.theme !== 'light';
    const color = this.settings.theme === 'amoled' ? '#000000' : (this.settings.theme === 'light' ? '#ffffff' : '#12141a');
    setStatusBarTheme(isDark, color);

    // 4. Initialize Hardware Back Button listener
    BackButton.init();

    // 5. Instantiate Controllers
    this.gate = new GateController(this);
    this.sheet = new BottomSheetController(this);
    this.viewer = new ViewerController(this);
    this.gallery = new GalleryController(this);
    this.search = new SearchController(this);
    this.favorites = new FavoritesController(this);
    this.history = new HistoryController(this);
    this.settingsController = new SettingsController(this);

    // 6. Initialize Controller DOM Listeners
    this.gate.init();
    this.sheet.init();
    this.viewer.init();
    this.gallery.init();
    this.search.init();
    this.favorites.init();
    this.history.init();
    this.settingsController.init();

    // 7. Setup Navigation Tabs
    this.setupNav();

    // 8. Age Gate & PIN Security Checks
    this.gate.checkAgeGate();
    this.gate.checkPinLock();

    // 9. Initial Feed Load
    this.gallery.loadInitial();

    // 10. Update i18n in DOM
    applyI18nToDOM();
  }

  setupNav() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab && tab !== this.currentTab) {
          Haptics.selection();
          this.switchTab(tab);
        }
      });
    });

    // Android back button default behavior when inside secondary tabs
    window.addEventListener('popstate', () => {
      if (this.currentTab !== 'browse') {
        this.switchTab('browse');
      }
    });
  }

  switchTab(tabName) {
    if (this.currentTab === tabName) return;

    // Remove active class from previous tab and view
    document.querySelector(`.nav-item[data-tab="${this.currentTab}"]`)?.classList.remove('active');
    document.getElementById(`view-${this.currentTab}`)?.classList.remove('active');

    this.currentTab = tabName;

    // Activate new tab and view
    document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.classList.add('active');
    const newView = document.getElementById(`view-${tabName}`);
    if (newView) {
      newView.classList.add('active');
    }

    // Register back button handler if not on root browse tab
    if (tabName !== 'browse') {
      BackButton.push(`tab-${tabName}`, () => {
        this.switchTab('browse');
      });
    }

    // Trigger tab-specific activation lifecycle
    if (tabName === 'search') {
      this.search.activate();
    } else if (tabName === 'favorites') {
      this.favorites.activate();
    } else if (tabName === 'history') {
      this.history.activate();
    } else if (tabName === 'browse' && this.gallery.posts.length === 0) {
      this.gallery.loadInitial();
    }
  }

  searchWithTags(query) {
    this.switchTab('browse');
    this.gallery.loadInitial(query);
  }

  showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px) scale(0.95)';
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  showDownloadBubble(percent, message) {
    const bubble = document.getElementById('download-bubble');
    const textEl = document.getElementById('download-bubble-text');
    if (!bubble || !textEl) return;

    clearTimeout(this.downloadBubbleTimeout);
    textEl.textContent = `${message} (${percent}%)`;
    bubble.classList.add('show');

    if (percent >= 100) {
      textEl.textContent = message;
      this.downloadBubbleTimeout = setTimeout(() => {
        bubble.classList.remove('show');
      }, 3500);
    }
  }
}

// Instantiate and start app
window.app = new App();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
