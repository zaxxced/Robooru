/**
 * Favorites & Collections Controller
 * Organize saved posts into folders/collections, export/import via JSON
 */

import { 
  getFavorites, 
  getCollections, 
  createCollection, 
  exportFavoritesJSON, 
  importFavoritesJSON 
} from '../store.js';
import { Haptics } from '../utils/capacitor.js';
import { t } from '../utils/i18n.js';

export class FavoritesController {
  constructor(app) {
    this.app = app;
    this.currentCollection = 'All';
    this.favorites = [];
  }

  init() {
    this.collectionTabs = document.getElementById('fav-collection-tabs');
    this.favGrid = document.getElementById('fav-grid');
    this.emptyState = document.getElementById('fav-empty');
    this.btnExport = document.getElementById('btn-export-fav');
    this.btnImport = document.getElementById('btn-import-fav');
    this.fileInput = document.getElementById('fav-import-file');
    this.btnNewCollection = document.getElementById('btn-new-collection');

    this.btnNewCollection?.addEventListener('click', () => {
      this.promptNewCollection();
    });

    this.btnExport?.addEventListener('click', async () => {
      await this.exportBackup();
    });

    this.btnImport?.addEventListener('click', () => {
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await this.importBackup(file);
        e.target.value = '';
      }
    });
  }

  async activate() {
    await this.renderCollections();
    await this.loadFavorites();
  }

  async renderCollections() {
    if (!this.collectionTabs) return;
    const collections = await getCollections();

    this.collectionTabs.innerHTML = collections.map(col => `
      <button class="tag-chip ${col === this.currentCollection ? 'active cat-general' : ''}" data-col="${col}">
        ${col}
      </button>
    `).join('');

    this.collectionTabs.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        Haptics.selection();
        this.currentCollection = btn.getAttribute('data-col');
        this.renderCollections();
        this.loadFavorites();
      });
    });
  }

  async promptNewCollection() {
    const name = window.prompt(t('collection_name_prompt'), '');
    if (name && name.trim()) {
      await createCollection(name.trim());
      this.currentCollection = name.trim();
      await this.renderCollections();
      await this.loadFavorites();
      this.app.showToast(t('collection_created'));
    }
  }

  async loadFavorites() {
    const favs = await getFavorites(this.currentCollection);
    this.favorites = favs.map(f => f.post);

    if (this.favorites.length === 0) {
      if (this.emptyState) this.emptyState.style.display = 'flex';
      if (this.favGrid) this.favGrid.innerHTML = '';
      return;
    }

    if (this.emptyState) this.emptyState.style.display = 'none';
    this.renderFavGrid();
  }

  renderFavGrid() {
    const cols = parseInt(this.app.settings.grid_columns, 10) || 2;
    this.favGrid.className = `masonry-grid grid-cols-${cols}`;
    this.favGrid.innerHTML = '';

    const colElements = [];
    for (let c = 0; c < cols; c++) {
      const colDiv = document.createElement('div');
      colDiv.className = 'masonry-col';
      this.favGrid.appendChild(colDiv);
      colElements.push(colDiv);
    }

    this.favorites.forEach((post, idx) => {
      const targetCol = colElements[idx % cols];
      const card = this.createFavCard(post, idx);
      targetCol.appendChild(card);
    });
  }

  createFavCard(post, index) {
    const card = document.createElement('div');
    card.className = 'post-card';

    const inner = document.createElement('div');
    inner.className = 'post-card-inner';
    const paddingPercent = Math.min(160, Math.max(65, (post.height / post.width) * 100));
    inner.style.paddingBottom = `${paddingPercent}%`;

    const img = document.createElement('img');
    img.className = 'post-thumb';
    img.alt = post.tags;
    img.loading = 'lazy';
    img.src = post.sample_url || post.preview_url;
    img.onload = () => img.classList.add('loaded');
    inner.appendChild(img);

    // Badges
    const badges = document.createElement('div');
    badges.className = 'card-badges';
    badges.innerHTML = `
      <span class="rating-badge rating-${post.rating}">${post.rating.substring(0, 1).toUpperCase()}</span>
      <span style="font-size:0.75rem; color:#f43f5e;">♥</span>
    `;
    inner.appendChild(badges);

    card.appendChild(inner);

    card.addEventListener('click', () => {
      Haptics.selection();
      this.app.viewer.open(this.favorites, index);
    });

    return card;
  }

  async exportBackup() {
    try {
      Haptics.notification('SUCCESS');
      const json = await exportFavoritesJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boorubrowser_favorites_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.app.showToast(t('fav_exported'));
    } catch (err) {
      console.error('Export error:', err);
    }
  }

  async importBackup(file) {
    try {
      const text = await file.text();
      const count = await importFavoritesJSON(text);
      Haptics.notification('SUCCESS');
      this.app.showToast(`${t('fav_imported')} (${count} posts)`);
      await this.renderCollections();
      await this.loadFavorites();
    } catch (err) {
      console.error('Import error:', err);
      this.app.showToast('Invalid JSON file format');
    }
  }
}
