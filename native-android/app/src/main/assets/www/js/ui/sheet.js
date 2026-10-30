/**
 * Bottom Sheet Details Controller
 * Categorized tags (tap to search, long-press to exclude), score, rating, source, parent/child relations
 */

import { Haptics, BackButton } from '../utils/capacitor.js';
import { fetchTagCategories } from '../api.js';
import { t } from '../utils/i18n.js';

export class BottomSheetController {
  constructor(app) {
    this.app = app;
    this.isOpen = false;
    this.currentPost = null;
    this.longPressTimer = null;
    this.isLongPress = false;
  }

  init() {
    this.backdrop = document.getElementById('details-sheet-backdrop');
    this.sheet = document.getElementById('details-sheet');
    this.btnClose = document.getElementById('btn-close-sheet');
    this.contentEl = document.getElementById('sheet-details-content');

    this.backdrop?.addEventListener('click', () => this.close());
    this.btnClose?.addEventListener('click', () => this.close());

    // Pull down handle on sheet to close
    const handleBar = this.sheet?.querySelector('.sheet-handle-bar');
    let startY = 0;
    handleBar?.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    handleBar?.addEventListener('touchmove', (e) => {
      const deltaY = e.touches[0].clientY - startY;
      if (deltaY > 0) {
        this.sheet.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    handleBar?.addEventListener('touchend', (e) => {
      const deltaY = e.changedTouches[0].clientY - startY;
      if (deltaY > 80) {
        this.close();
      } else {
        this.sheet.style.transform = '';
      }
    }, { passive: true });
  }

  async open(post) {
    this.currentPost = post;
    this.isOpen = true;
    this.sheet.style.transform = '';
    this.backdrop.classList.add('open');
    this.sheet.classList.add('open');

    BackButton.push('bottom-sheet', () => this.close());
    this.renderLoading();

    // Fetch tag category classification
    const tagCategories = await fetchTagCategories(post.tagsArray);
    this.renderDetails(post, tagCategories);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.sheet.style.transform = '';
    this.backdrop.classList.remove('open');
    this.sheet.classList.remove('open');
    BackButton.remove('bottom-sheet');
  }

  renderLoading() {
    this.contentEl.innerHTML = `
      <div style="padding: 24px 0; display:flex; justify-content:center;">
        <div class="infinite-spinner"></div>
      </div>
    `;
  }

  renderDetails(post, categories) {
    // Group tags into categorized buckets
    const groups = {
      artist: [],
      character: [],
      copyright: [],
      general: [],
      metadata: []
    };

    post.tagsArray.forEach(tag => {
      const cat = categories[tag] || 'general';
      if (groups[cat]) {
        groups[cat].push(tag);
      } else {
        groups.general.push(tag);
      }
    });

    const ratingKey = `rating_${post.rating || 'general'}`;
    const ratingLabel = t(ratingKey, post.rating.toUpperCase());

    const html = `
      <!-- Metadata Grid -->
      <div class="meta-grid">
        <div class="meta-box">
          <span class="meta-box-label">${t('details_id')}</span>
          <span class="meta-box-val">#${post.id}</span>
        </div>
        <div class="meta-box">
          <span class="meta-box-label">${t('details_score')}</span>
          <span class="meta-box-val">★ ${post.score}</span>
        </div>
        <div class="meta-box">
          <span class="meta-box-label">${t('details_rating')}</span>
          <span class="meta-box-val">
            <span class="rating-badge rating-${post.rating}">${ratingLabel}</span>
          </span>
        </div>
        <div class="meta-box">
          <span class="meta-box-label">${t('details_dimensions')}</span>
          <span class="meta-box-val">${post.width} × ${post.height}</span>
        </div>
      </div>

      <!-- Additional Details -->
      <div class="settings-card" style="margin-top: 4px;">
        ${post.owner ? `
          <div class="settings-row">
            <span class="settings-row-title">${t('details_uploader')}</span>
            <span class="meta-box-val" style="color:var(--text-secondary);">${post.owner}</span>
          </div>
        ` : ''}
        ${post.source ? `
          <div class="settings-row">
            <span class="settings-row-title">${t('details_source')}</span>
            <span class="meta-box-val">
              <a href="${post.source}" target="_blank" rel="noopener noreferrer">${post.source.length > 30 ? post.source.substring(0, 30) + '...' : post.source}</a>
            </span>
          </div>
        ` : ''}
        ${post.parent_id ? `
          <div class="settings-row">
            <span class="settings-row-title">Parent Post</span>
            <span class="meta-box-val">#${post.parent_id}</span>
          </div>
        ` : ''}
        ${post.has_children ? `
          <div class="settings-row">
            <span class="settings-row-title">Child Variations</span>
            <span class="meta-box-val">Has children</span>
          </div>
        ` : ''}
      </div>

      <div style="font-size: 0.76rem; color: var(--text-muted); text-align: center; margin-top: 4px;">
        ${t('details_hint')}
      </div>

      <!-- Categorized Tags -->
      <div style="display:flex; flex-direction:column; gap:16px; margin-top: 4px;">
        ${this.renderTagGroup(t('cat_artist'), groups.artist, 'artist')}
        ${this.renderTagGroup(t('cat_character'), groups.character, 'character')}
        ${this.renderTagGroup(t('cat_copyright'), groups.copyright, 'copyright')}
        ${this.renderTagGroup(t('cat_general'), groups.general, 'general')}
        ${this.renderTagGroup(t('cat_metadata'), groups.metadata, 'metadata')}
      </div>
    `;

    this.contentEl.innerHTML = html;
    this.bindTagChips();
  }

  renderTagGroup(title, tags, categoryClass) {
    if (!tags || tags.length === 0) return '';
    return `
      <div class="tag-category-section">
        <div class="tag-category-header">
          <span>${title}</span>
          <span style="opacity:0.6; font-size:0.72rem;">(${tags.length})</span>
        </div>
        <div class="tag-chips-wrap">
          ${tags.map(tag => `
            <button class="tag-chip cat-${categoryClass}" data-tag="${tag}">
              ${tag.replace(/_/g, ' ')}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindTagChips() {
    this.contentEl.querySelectorAll('.tag-chip').forEach(chip => {
      const tag = chip.getAttribute('data-tag');

      const triggerSearch = () => {
        Haptics.selection();
        this.close();
        if (this.app.viewer) this.app.viewer.close();
        this.app.searchWithTags(tag);
      };

      const triggerExclude = () => {
        Haptics.notification('SUCCESS');
        this.app.showToast(`${t('tag_excluded')}-${tag}`);
        this.close();
        if (this.app.viewer) this.app.viewer.close();
        const currentQuery = this.app.gallery.currentTags ? `${this.app.gallery.currentTags} -${tag}` : `-${tag}`;
        this.app.searchWithTags(currentQuery);
      };

      // Handle touch and long press
      let pressTimer = null;
      let moved = false;

      chip.addEventListener('touchstart', (e) => {
        moved = false;
        pressTimer = setTimeout(() => {
          pressTimer = null;
          triggerExclude();
        }, 550);
      }, { passive: true });

      chip.addEventListener('touchmove', () => {
        moved = true;
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }, { passive: true });

      chip.addEventListener('touchend', () => {
        if (pressTimer && !moved) {
          clearTimeout(pressTimer);
          pressTimer = null;
          triggerSearch();
        }
      });

      chip.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        triggerExclude();
      });
    });
  }
}
