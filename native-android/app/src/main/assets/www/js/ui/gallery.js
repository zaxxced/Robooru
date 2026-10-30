/**
 * Masonry Gallery Controller
 * Multi-column masonry grid, page navigation, pull-to-refresh, skeleton loaders,
 * lazy image loading, NSFW blur toggle, and blacklist filtering
 */

import { fetchPosts } from '../api.js';
import { PullToRefresh } from '../utils/gestures.js';
import { Haptics, setImageSrc, downloadMedia } from '../utils/capacitor.js';
import { t } from '../utils/i18n.js';

export class GalleryController {
  constructor(app) {
    this.app = app;
    this.posts = [];
    this.page = 0;
    this.currentTags = '';
    this.isLoading = false;
    this.hasMore = true;
    this.totalHiddenByBlacklist = 0;
    this.longPressTimer = null;
    this.suppressCardClick = false;

    this.observer = null;
    this.columnHeights = [];
  }

  init() {
    this.scrollContainer = document.getElementById('browse-scroll');
    this.ptrContainer = document.getElementById('browse-ptr');
    this.gridContainer = document.getElementById('browse-grid');
    this.blacklistBanner = document.getElementById('blacklist-banner');
    this.infiniteLoader = document.getElementById('browse-loader');
    this.emptyState = document.getElementById('browse-empty');
    this.currentSearchChip = document.getElementById('browse-current-query');
    this.pagePrev = document.getElementById('browse-page-prev');
    this.pageNext = document.getElementById('browse-page-next');
    this.pageLabel = document.getElementById('browse-page-label');
    this.pageControls = document.getElementById('browse-page-controls');

    this.pagePrev?.addEventListener('click', () => this.goToPage(this.page - 1));
    this.pageNext?.addEventListener('click', () => this.goToPage(this.page + 1));

    // Setup pull-to-refresh
    if (this.scrollContainer && this.ptrContainer) {
      new PullToRefresh(this.scrollContainer, this.ptrContainer, async () => {
        await this.refresh();
      });
    }

    // Browsing uses explicit pagination instead of endless scrolling.
    if (this.infiniteLoader) this.infiniteLoader.style.display = 'none';
  }


  async loadInitial(tags = '', restoreState = false) {
    if (restoreState) {
      try {
        const savedTags = localStorage.getItem('robooru-browse-tags');
        const savedPage = Number.parseInt(localStorage.getItem('robooru-browse-page') || '0', 10);
        this.currentTags = savedTags ?? tags.trim();
        this.page = Number.isFinite(savedPage) && savedPage >= 0 ? savedPage : 0;
      } catch {
        this.currentTags = tags.trim();
        this.page = 0;
      }
    } else {
      this.currentTags = tags.trim();
      this.page = 0;
      try {
        localStorage.setItem('robooru-browse-tags', this.currentTags);
        localStorage.setItem('robooru-browse-page', '0');
      } catch {}
    }
    this.posts = [];
    this.hasMore = true;
    this.totalHiddenByBlacklist = 0;

    // Update query chip at top if search is active
    if (this.currentSearchChip) {
      if (this.currentTags) {
        this.currentSearchChip.style.display = 'inline-flex';
        this.currentSearchChip.innerHTML = `
          <span>${this.currentTags}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        this.currentSearchChip.onclick = () => {
          this.loadInitial('');
        };
      } else {
        this.currentSearchChip.style.display = 'none';
      }
    }

    this.renderSkeletons();
    if (this.emptyState) this.emptyState.style.display = 'none';

    await this.fetchBatch();
  }

  async refresh() {
    this.posts = [];
    this.hasMore = true;
    this.totalHiddenByBlacklist = 0;
    if (this.scrollContainer) this.scrollContainer.scrollTop = 0;
    await this.fetchBatch();
  }

  async goToPage(targetPage) {
    if (this.isLoading || targetPage < 0 || targetPage === this.page) return false;
    if (targetPage > this.page && !this.hasMore) return false;
    this.page = targetPage;
    try { localStorage.setItem('robooru-browse-page', String(this.page)); } catch {}
    this.posts = [];
    this.totalHiddenByBlacklist = 0;
    this.renderSkeletons();
    if (this.scrollContainer) this.scrollContainer.scrollTop = 0;
    return await this.fetchBatch();
  }

  async fetchBatch() {
    this.isLoading = true;
    if (this.infiniteLoader) this.infiniteLoader.style.display = 'flex';

    try {
      const res = await fetchPosts({
        tags: this.currentTags,
        page: this.page,
        limit: 40,
        apiKey: this.app.settings.api_key,
        userId: this.app.settings.user_id,
        ratingFilter: this.app.settings.rating_filter,
        blacklist: this.app.settings.blacklist
      });

      // Replace the whole grid on every page so old skeleton cards cannot remain.
      this.posts = res.posts;
      this.renderGrid(true);

      this.totalHiddenByBlacklist += res.hiddenByBlacklist;
      this.updateBlacklistBanner();

      this.hasMore = res.totalCount > 0
        ? ((this.page + 1) * 40 < res.totalCount)
        : res.posts.length >= 20;
      try { localStorage.setItem('robooru-browse-page', String(this.page)); } catch {}
      if (this.infiniteLoader) this.infiniteLoader.style.display = 'none';
      this.updatePageControls();

      // Check empty state
      if (this.posts.length === 0) {
        if (this.emptyState) this.emptyState.style.display = 'flex';
      } else {
        if (this.emptyState) this.emptyState.style.display = 'none';
      }

      return res.posts.length > 0;
    } catch (err) {
      console.error('Fetch posts error:', err);
      this.app.showToast(t('network_error'));
      this.hasMore = false;
      this.updatePageControls();
      return false;
    } finally {
      this.isLoading = false;
      if (this.infiniteLoader) this.infiniteLoader.style.display = 'none';
      this.updatePageControls();
    }
  }

  updatePageControls() {
    if (this.pageLabel) this.pageLabel.textContent = `Page ${this.page + 1}`;
    if (this.pagePrev) this.pagePrev.disabled = this.page === 0 || this.isLoading;
    if (this.pageNext) this.pageNext.disabled = !this.hasMore || this.isLoading;
    if (this.pageControls) this.pageControls.style.display = 'flex';
  }

  downloadPost(post) {
    const filename = `gelbooru_${post.id}.${post.fileType || 'jpg'}`;
    const downloadId = this.app.downloads?.start(filename);
    downloadMedia(post.file_url, filename, (percent, message, status) => {
      if (downloadId != null) this.app.downloads?.update(downloadId, percent, message, status);
    }).then(success => {
      if (!success && downloadId != null) this.app.downloads?.update(downloadId, 0, 'Download failed', 'failed');
    }).catch(() => {
      if (downloadId != null) this.app.downloads?.update(downloadId, 0, 'Download failed', 'failed');
      this.app.showToast('Download failed');
    });
  }

  showPostContextMenu(post, x, y) {
    document.querySelector('.post-context-menu')?.remove();
    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'post-context-menu';
    menu.textContent = '⬇  Unduh gambar ini';
    menu.style.left = `${Math.max(8, Math.min(x, window.innerWidth - 190))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - 58))}px`;
    menu.addEventListener('click', (event) => {
      event.stopPropagation();
      menu.remove();
      this.downloadPost(post);
    });
    document.body.appendChild(menu);
    const dismiss = (event) => {
      if (!menu.contains(event.target)) {
        menu.remove();
        document.removeEventListener('pointerdown', dismiss, true);
      }
    };
    setTimeout(() => document.addEventListener('pointerdown', dismiss, true), 0);
  }

  renderSkeletons() {
    const cols = parseInt(this.app.settings.grid_columns, 10) || 2;
    this.gridContainer.className = `masonry-grid grid-cols-${cols}`;
    this.gridContainer.innerHTML = '';

    for (let c = 0; c < cols; c++) {
      const colDiv = document.createElement('div');
      colDiv.className = 'masonry-col';

      // Add 3 shimmer cards per column
      for (let i = 0; i < 3; i++) {
        const h = 180 + ((c + i) % 3) * 60;
        const skel = document.createElement('div');
        skel.className = 'skeleton';
        skel.style.width = '100%';
        skel.style.height = `${h}px`;
        skel.style.marginBottom = '10px';
        colDiv.appendChild(skel);
      }
      this.gridContainer.appendChild(colDiv);
    }
  }

  renderGrid(clear = false) {
    const cols = parseInt(this.app.settings.grid_columns, 10) || 2;
    this.gridContainer.className = `masonry-grid grid-cols-${cols}`;
    this.gridContainer.innerHTML = '';
    this.columnHeights = new Array(cols).fill(0);

    for (let c = 0; c < cols; c++) {
      const colDiv = document.createElement('div');
      colDiv.className = 'masonry-col';
      this.gridContainer.appendChild(colDiv);
    }

    this.appendPostsToGrid(this.posts, 0);
  }

  appendPostsToGrid(newPosts, startIndex) {
    const cols = parseInt(this.app.settings.grid_columns, 10) || 2;
    const colElements = this.gridContainer.querySelectorAll('.masonry-col');
    if (colElements.length === 0) return;

    newPosts.forEach((post, i) => {
      const postIndex = startIndex + i;
      const card = this.createPostCard(post, postIndex);

      // Find shortest column
      let minCol = 0;
      let minHeight = this.columnHeights[0] || 0;
      for (let c = 1; c < cols; c++) {
        if ((this.columnHeights[c] || 0) < minHeight) {
          minHeight = this.columnHeights[c] || 0;
          minCol = c;
        }
      }

      // Estimate card height from aspect ratio
      const estimatedHeight = Math.max(140, Math.min(360, 200 / (post.aspect_ratio || 0.75)));
      this.columnHeights[minCol] = (this.columnHeights[minCol] || 0) + estimatedHeight;

      if (colElements[minCol]) {
        colElements[minCol].appendChild(card);
      }
    });
  }

  createPostCard(post, index) {
    const card = document.createElement('div');
    card.className = 'post-card';

    // Check NSFW Blur Setting
    const isNsfw = post.rating !== 'general' && post.rating !== 'g';
    if (isNsfw && this.app.settings.nsfw_blur) {
      card.classList.add('nsfw-blurred');
    }

    // Aspect ratio container
    const inner = document.createElement('div');
    inner.className = 'post-card-inner';
    const paddingPercent = Math.min(160, Math.max(65, (post.height / post.width) * 100));
    inner.style.paddingBottom = `${paddingPercent}%`;

    // Thumbnail image (or preview)
    const img = document.createElement('img');
    img.className = 'post-thumb';
    img.alt = post.tags;
    // Prioritize the first visible cards; let the rest load as the user scrolls.
    // This avoids starting all thumbnail requests at once on slower Android connections.
    img.loading = index < (parseInt(this.app.settings.grid_columns, 10) || 2) * 2
      ? 'eager'
      : 'lazy';
    img.decoding = 'auto';
    if (index < (parseInt(this.app.settings.grid_columns, 10) || 2) * 2) {
      img.fetchPriority = 'high';
    }
    img.style.position = 'absolute';
    img.style.top = '0';
    img.style.left = '0';

    // Grid always uses the small preview image (tens of KB) for fast scrolling;
    // the full-size sample is only loaded in the fullscreen viewer.
    const thumbCandidates = [post.preview_url, post.sample_url]
      .filter((u, i, a) => u && a.indexOf(u) === i);
    setImageSrc(img, thumbCandidates, {
      onLoad: () => img.classList.add('loaded')
    });

    inner.appendChild(img);

    // NSFW Reveal Overlay
    if (isNsfw && this.app.settings.nsfw_blur) {
      const nsfwOverlay = document.createElement('div');
      nsfwOverlay.className = 'nsfw-badge-overlay';
      nsfwOverlay.innerHTML = `
        <span class="nsfw-badge-text">${post.rating.toUpperCase()}</span>
        <span style="font-size:0.68rem; color:#ffffff; opacity:0.8;">Tap to show</span>
      `;
      nsfwOverlay.onclick = (e) => {
        e.stopPropagation();
        Haptics.selection();
        card.classList.remove('nsfw-blurred');
      };
      inner.appendChild(nsfwOverlay);
    }

    // Top badges: Video icon or rating
    const badges = document.createElement('div');
    badges.className = 'card-badges';

    if (post.isVideo) {
      badges.innerHTML += `
        <span class="card-type-icon" title="Video">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </span>
      `;
    } else if (post.isGif) {
      badges.innerHTML += `
        <span class="card-type-icon" style="font-size:0.65rem; font-weight:700;">GIF</span>
      `;
    } else {
      badges.innerHTML += `<span></span>`;
    }

    // Rating indicator
    badges.innerHTML += `
      <span class="rating-badge rating-${post.rating}">${post.rating.substring(0, 1).toUpperCase()}</span>
    `;
    inner.appendChild(badges);

    // Bottom hover info
    const footer = document.createElement('div');
    footer.className = 'card-footer-info';
    footer.innerHTML = `
      <span>★ ${post.score}</span>
      <span>${post.width}×${post.height}</span>
    `;
    inner.appendChild(footer);

    card.appendChild(inner);

    // Long-press a thumbnail to offer a full-resolution download.
    let pressX = 0;
    let pressY = 0;
    let longPressTriggered = false;
    const clearPress = () => {
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    };
    card.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      pressX = event.clientX;
      pressY = event.clientY;
      longPressTriggered = false;
      clearPress();
      this.longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        this.suppressCardClick = true;
        Haptics.selection();
        this.showPostContextMenu(post, pressX, pressY);
      }, 550);
    });
    card.addEventListener('pointermove', (event) => {
      if (Math.abs(event.clientX - pressX) > 12 || Math.abs(event.clientY - pressY) > 12) clearPress();
    });
    card.addEventListener('pointerup', clearPress);
    card.addEventListener('pointercancel', clearPress);
    card.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.suppressCardClick = true;
      this.showPostContextMenu(post, event.clientX, event.clientY);
    });

    // Tap card to open fullscreen viewer; suppress the tap after a long-press.
    card.addEventListener('click', (event) => {
      if (this.suppressCardClick || longPressTriggered) {
        event.preventDefault();
        event.stopPropagation();
        this.suppressCardClick = false;
        longPressTriggered = false;
        return;
      }
      Haptics.selection();
      this.app.viewer.open(this.posts, index);
    });

    return card;
  }

  updateBlacklistBanner() {
    if (!this.blacklistBanner) return;
    if (this.totalHiddenByBlacklist > 0) {
      this.blacklistBanner.classList.add('visible');
      this.blacklistBanner.innerHTML = `
        <span>🛡️ ${this.totalHiddenByBlacklist} ${t('posts_hidden_blacklist')}</span>
        <button class="btn btn-icon-subtle touch-target" style="width:32px; height:32px;" title="Dismiss">✕</button>
      `;
      this.blacklistBanner.querySelector('button')?.addEventListener('click', () => {
        this.blacklistBanner.classList.remove('visible');
      });
    } else {
      this.blacklistBanner.classList.remove('visible');
    }
  }
}
