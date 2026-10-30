/**
 * Settings Controller
 * Handles Gelbooru API credentials, themes (Dark/AMOLED/Light), accents,
 * grid columns, data saver, blacklist, PIN lock, language, and cache management
 */

import { saveSetting, clearStore } from '../store.js';
import { testApiConnection } from '../api.js';
import { Haptics, setStatusBarTheme } from '../utils/capacitor.js';
import { setLanguage, t } from '../utils/i18n.js';

export class SettingsController {
  constructor(app) {
    this.app = app;
  }

  init() {
    this.inputApiKey = document.getElementById('setting-api-key');
    this.inputUserId = document.getElementById('setting-user-id');
    this.btnSaveApi = document.getElementById('btn-save-api');
    this.selectTheme = document.getElementById('setting-theme');
    this.selectColumns = document.getElementById('setting-columns');
    this.selectQuality = document.getElementById('setting-quality');
    this.switchDataSaver = document.getElementById('setting-data-saver');
    this.selectRating = document.getElementById('setting-rating-filter');
    this.switchNsfwBlur = document.getElementById('setting-nsfw-blur');
    this.blacklistInput = document.getElementById('setting-blacklist');
    this.btnSaveBlacklist = document.getElementById('btn-save-blacklist');
    this.switchPinLock = document.getElementById('setting-pin-lock');
    this.btnSetPin = document.getElementById('btn-set-pin');
    this.selectLanguage = document.getElementById('setting-language');
    this.btnClearCache = document.getElementById('btn-clear-cache');
    this.btnResetAll = document.getElementById('btn-reset-all');

    // Populate initial inputs from app settings
    this.populateValues();
    this.bindEvents();
  }

  populateValues() {
    const s = this.app.settings;
    if (this.inputApiKey) this.inputApiKey.value = s.api_key || '';
    if (this.inputUserId) this.inputUserId.value = s.user_id || '';
    if (this.selectTheme) this.selectTheme.value = s.theme || 'dark';
    if (this.selectColumns) this.selectColumns.value = String(s.grid_columns || 2);
    if (this.selectQuality) this.selectQuality.value = s.image_quality || 'sample';
    if (this.switchDataSaver) this.switchDataSaver.checked = !!s.data_saver;
    if (this.selectRating) this.selectRating.value = s.rating_filter || 'standard';
    if (this.switchNsfwBlur) this.switchNsfwBlur.checked = s.nsfw_blur !== false;
    if (this.blacklistInput) this.blacklistInput.value = (s.blacklist || []).join(', ');
    if (this.switchPinLock) this.switchPinLock.checked = !!s.pin_enabled;
    if (this.selectLanguage) this.selectLanguage.value = s.language || 'en';

    // Highlight active accent swatch
    document.querySelectorAll('.accent-swatch').forEach(swatch => {
      const acc = swatch.getAttribute('data-accent');
      if (acc === s.accent) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
  }

  bindEvents() {
    // API Save & Test
    this.btnSaveApi?.addEventListener('click', async () => {
      Haptics.selection();
      const apiKey = this.inputApiKey.value.trim();
      const userId = this.inputUserId.value.trim();

      await saveSetting('api_key', apiKey);
      await saveSetting('user_id', userId);
      this.app.settings.api_key = apiKey;
      this.app.settings.user_id = userId;

      if (apiKey && userId) {
        this.app.showToast('Verifying Gelbooru credentials...');
        const ok = await testApiConnection(apiKey, userId);
        if (ok) {
          Haptics.notification('SUCCESS');
          this.app.showToast(t('settings_api_success'));
        } else {
          Haptics.notification('ERROR');
          this.app.showToast(t('settings_api_fail'));
        }
      } else {
        this.app.showToast('Credentials saved (public mode)');
      }
    });

    // Theme Switch
    this.selectTheme?.addEventListener('change', async (e) => {
      const theme = e.target.value;
      Haptics.selection();
      await saveSetting('theme', theme);
      this.app.settings.theme = theme;
      this.applyTheme(theme);
    });

    // Accent Swatches
    document.querySelectorAll('.accent-swatch').forEach(swatch => {
      swatch.addEventListener('click', async () => {
        const accent = swatch.getAttribute('data-accent');
        Haptics.selection();
        await saveSetting('accent', accent);
        this.app.settings.accent = accent;
        this.applyAccent(accent);
        document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
    });

    // Grid Columns
    this.selectColumns?.addEventListener('change', async (e) => {
      const cols = parseInt(e.target.value, 10);
      Haptics.selection();
      await saveSetting('grid_columns', cols);
      this.app.settings.grid_columns = cols;
      if (this.app.gallery) this.app.gallery.renderGrid();
    });

    // Image Quality
    this.selectQuality?.addEventListener('change', async (e) => {
      const quality = e.target.value;
      Haptics.selection();
      await saveSetting('image_quality', quality);
      this.app.settings.image_quality = quality;
    });

    // Data Saver
    this.switchDataSaver?.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      Haptics.selection();
      await saveSetting('data_saver', enabled);
      this.app.settings.data_saver = enabled;
    });

    // Rating Filter
    this.selectRating?.addEventListener('change', async (e) => {
      const filter = e.target.value;
      Haptics.selection();
      await saveSetting('rating_filter', filter);
      this.app.settings.rating_filter = filter;
      if (this.app.gallery) this.app.gallery.refresh();
    });

    // NSFW Blur
    this.switchNsfwBlur?.addEventListener('change', async (e) => {
      const blur = e.target.checked;
      Haptics.selection();
      await saveSetting('nsfw_blur', blur);
      this.app.settings.nsfw_blur = blur;
      if (this.app.gallery) this.app.gallery.renderGrid();
    });

    // Blacklist
    this.btnSaveBlacklist?.addEventListener('click', async () => {
      Haptics.selection();
      const raw = this.blacklistInput.value;
      const list = raw.split(/[,\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      await saveSetting('blacklist', list);
      this.app.settings.blacklist = list;
      this.app.showToast('Blacklist saved');
      if (this.app.gallery) this.app.gallery.refresh();
    });

    // PIN Lock Toggle
    this.switchPinLock?.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      Haptics.selection();

      if (enabled) {
        // Prompt user to choose a 4-digit PIN
        this.app.gate.showPinPrompt({
          title: t('pin_confirm'),
          onSuccess: async (newPin) => {
            await saveSetting('pin_enabled', true);
            await saveSetting('pin_code', newPin);
            this.app.settings.pin_enabled = true;
            this.app.settings.pin_code = newPin;
            this.app.showToast(t('settings_pin_saved'));
          }
        });
      } else {
        await saveSetting('pin_enabled', false);
        await saveSetting('pin_code', '');
        this.app.settings.pin_enabled = false;
        this.app.settings.pin_code = '';
        this.app.showToast(t('settings_pin_removed'));
      }
    });

    this.btnSetPin?.addEventListener('click', () => {
      this.app.gate.showPinPrompt({
        title: t('pin_confirm'),
        onSuccess: async (newPin) => {
          await saveSetting('pin_enabled', true);
          await saveSetting('pin_code', newPin);
          this.app.settings.pin_enabled = true;
          this.app.settings.pin_code = newPin;
          this.switchPinLock.checked = true;
          this.app.showToast(t('settings_pin_saved'));
        }
      });
    });

    // Language
    this.selectLanguage?.addEventListener('change', async (e) => {
      const lang = e.target.value;
      Haptics.selection();
      await saveSetting('language', lang);
      this.app.settings.language = lang;
      setLanguage(lang);
    });

    // Clear Cache
    this.btnClearCache?.addEventListener('click', async () => {
      Haptics.selection();
      await clearStore('api_cache');
      this.app.showToast(t('settings_cache_cleared'));
    });

    // Reset All Data
    this.btnResetAll?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all data, favorites, and settings?')) {
        Haptics.impact('HEAVY');
        await clearStore('settings');
        await clearStore('favorites');
        await clearStore('history');
        await clearStore('collections');
        await clearStore('recent_searches');
        await clearStore('saved_searches');
        await clearStore('api_cache');
        window.location.reload();
      }
    });
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme !== 'light';
    const color = theme === 'amoled' ? '#000000' : (theme === 'light' ? '#ffffff' : '#12141a');
    setStatusBarTheme(isDark, color);
  }

  applyAccent(accent) {
    document.documentElement.setAttribute('data-accent', accent);
  }
}
