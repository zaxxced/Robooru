/**
 * Search Controller
 * Debounced autocomplete with category colors and post counts,
 * active tag chips with negation (-tag), rating/sort filters, recent and saved searches
 */

import { autocompleteTags } from '../api.js';
import { 
  addRecentSearch, 
  getRecentSearches, 
  removeRecentSearch, 
  clearRecentSearches,
  saveSearch, 
  getSavedSearches, 
  removeSavedSearch 
} from '../store.js';
import { Haptics } from '../utils/capacitor.js';
import { t } from '../utils/i18n.js';

export class SearchController {
  constructor(app) {
    this.app = app;
    this.activeTags = []; // [{ name: '1girl', negated: false }, ...]
    this.debounceTimer = null;
  }

  init() {
    this.searchInput = document.getElementById('search-input');
    this.autocompleteList = document.getElementById('autocomplete-dropdown');
    this.chipsContainer = document.getElementById('search-chips-container');
    this.btnExecuteSearch = document.getElementById('btn-execute-search');
    this.recentList = document.getElementById('recent-searches-list');
    this.savedList = document.getElementById('saved-searches-list');
    this.btnClearRecent = document.getElementById('btn-clear-recent');
    this.btnSaveCurrent = document.getElementById('btn-save-current-search');

    // Search Input listeners
    this.searchInput?.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });

    this.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this.searchInput.value.trim();
        if (val) {
          this.addTag(val);
          this.searchInput.value = '';
          this.closeAutocomplete();
        }
        this.executeSearch();
      }
    });

    this.btnExecuteSearch?.addEventListener('click', () => {
      const val = this.searchInput.value.trim();
      if (val) {
        this.addTag(val);
        this.searchInput.value = '';
      }
      this.executeSearch();
    });

    this.btnClearRecent?.addEventListener('click', async () => {
      Haptics.selection();
      await clearRecentSearches();
      this.renderRecentSearches();
    });

    this.btnSaveCurrent?.addEventListener('click', async () => {
      const q = this.getQueryString();
      if (q) {
        Haptics.notification('SUCCESS');
        await saveSearch(q);
        this.app.showToast('Search query saved!');
        this.renderSavedSearches();
      }
    });

    // Quick filter chips (rating, sort)
    document.querySelectorAll('.filter-chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        if (tag) {
          Haptics.selection();
          this.addTag(tag);
        }
      });
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-bar-wrap')) {
        this.closeAutocomplete();
      }
    });
  }

  async activate() {
    this.renderChips();
    await this.renderRecentSearches();
    await this.renderSavedSearches();
  }

  handleInput(text) {
    clearTimeout(this.debounceTimer);
    const trimmed = text.trim();

    if (!trimmed || trimmed.length < 2) {
      this.closeAutocomplete();
      return;
    }

    // Extract last word if multiple words typed
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1];

    this.debounceTimer = setTimeout(async () => {
      const results = await autocompleteTags(lastWord);
      this.renderAutocomplete(results);
    }, 280);
  }

  renderAutocomplete(items) {
    if (!items || items.length === 0) {
      this.closeAutocomplete();
      return;
    }

    this.autocompleteList.innerHTML = items.map((item) => {
      const countStr = item.post_count ? Number(item.post_count).toLocaleString() : '';
      return `
        <div class="autocomplete-item" data-value="${item.value}">
          <span class="ac-tag-name cat-${item.category}">
            ${item.value.replace(/_/g, ' ')}
          </span>
          <span class="ac-post-count">${countStr}</span>
        </div>
      `;
    }).join('');

    this.autocompleteList.querySelectorAll('.autocomplete-item').forEach((el) => {
      el.addEventListener('click', () => {
        Haptics.selection();
        const val = el.getAttribute('data-value');
        this.addTag(val);
        this.searchInput.value = '';
        this.closeAutocomplete();
      });
    });

    this.autocompleteList.classList.add('open');
  }

  closeAutocomplete() {
    this.autocompleteList?.classList.remove('open');
  }

  addTag(rawTag) {
    const clean = rawTag.trim();
    if (!clean) return;

    // Check if tag is negated
    const isNeg = clean.startsWith('-');
    const name = isNeg ? clean.substring(1) : clean;

    // Avoid duplicates
    if (!this.activeTags.some(t => t.name === name)) {
      this.activeTags.push({ name, negated: isNeg });
      this.renderChips();
    }
  }

  toggleTagNegation(name) {
    const found = this.activeTags.find(t => t.name === name);
    if (found) {
      found.negated = !found.negated;
      this.renderChips();
    }
  }

  removeTag(name) {
    this.activeTags = this.activeTags.filter(t => t.name !== name);
    this.renderChips();
  }

  renderChips() {
    if (!this.chipsContainer) return;
    this.chipsContainer.innerHTML = '';

    this.activeTags.forEach((tag) => {
      const chip = document.createElement('div');
      chip.className = `tag-chip ${tag.negated ? 'negated' : ''}`;
      chip.innerHTML = `
        <span class="chip-name">${tag.negated ? '-' : ''}${tag.name.replace(/_/g, ' ')}</span>
        <span class="chip-remove" style="opacity:0.6; padding-left:4px;">✕</span>
      `;

      // Tap name to toggle negation
      chip.querySelector('.chip-name').onclick = (e) => {
        e.stopPropagation();
        Haptics.selection();
        this.toggleTagNegation(tag.name);
      };

      // Tap 'x' to remove
      chip.querySelector('.chip-remove').onclick = (e) => {
        e.stopPropagation();
        Haptics.selection();
        this.removeTag(tag.name);
      };

      this.chipsContainer.appendChild(chip);
    });
  }

  getQueryString() {
    return this.activeTags.map(t => (t.negated ? `-${t.name}` : t.name)).join(' ');
  }

  async executeSearch() {
    const query = this.getQueryString();
    if (query) {
      await addRecentSearch(query);
    }
    Haptics.impact('MEDIUM');
    this.app.searchWithTags(query);
  }

  async renderRecentSearches() {
    if (!this.recentList) return;
    const items = await getRecentSearches(8);

    if (items.length === 0) {
      this.recentList.innerHTML = `<div style="font-size:0.82rem; color:var(--text-muted); padding:8px 0;">No recent searches</div>`;
      return;
    }

    this.recentList.innerHTML = items.map(item => `
      <div class="settings-row" style="padding: 10px 0;">
        <span class="recent-query-text" data-q="${item.query}" style="font-size:0.88rem; font-weight:500; cursor:pointer; flex:1;">
          🔍 ${item.query}
        </span>
        <button class="btn-icon-subtle btn-del-recent" data-q="${item.query}" style="width:36px; height:36px;">✕</button>
      </div>
    `).join('');

    this.recentList.querySelectorAll('.recent-query-text').forEach(el => {
      el.addEventListener('click', () => {
        const q = el.getAttribute('data-q');
        this.setTagsFromQuery(q);
        this.executeSearch();
      });
    });

    this.recentList.querySelectorAll('.btn-del-recent').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const q = btn.getAttribute('data-q');
        await removeRecentSearch(q);
        this.renderRecentSearches();
      });
    });
  }

  async renderSavedSearches() {
    if (!this.savedList) return;
    const items = await getSavedSearches();

    if (items.length === 0) {
      this.savedList.innerHTML = `<div style="font-size:0.82rem; color:var(--text-muted); padding:8px 0;">No saved searches</div>`;
      return;
    }

    this.savedList.innerHTML = items.map(item => `
      <div class="settings-row" style="padding: 10px 0;">
        <span class="saved-query-text" data-q="${item.query}" style="font-size:0.88rem; font-weight:600; color:var(--accent-primary); cursor:pointer; flex:1;">
          ★ ${item.query}
        </span>
        <button class="btn-icon-subtle btn-del-saved" data-q="${item.query}" style="width:36px; height:36px;">✕</button>
      </div>
    `).join('');

    this.savedList.querySelectorAll('.saved-query-text').forEach(el => {
      el.addEventListener('click', () => {
        const q = el.getAttribute('data-q');
        this.setTagsFromQuery(q);
        this.executeSearch();
      });
    });

    this.savedList.querySelectorAll('.btn-del-saved').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const q = btn.getAttribute('data-q');
        await removeSavedSearch(q);
        this.renderSavedSearches();
      });
    });
  }

  setTagsFromQuery(queryStr) {
    this.activeTags = [];
    const parts = queryStr.trim().split(/\s+/).filter(Boolean);
    parts.forEach(p => {
      const isNeg = p.startsWith('-');
      const name = isNeg ? p.substring(1) : p;
      this.activeTags.push({ name, negated: isNeg });
    });
    this.renderChips();
  }
}
