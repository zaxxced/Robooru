/**
 * Fullscreen Media Viewer Controller
 * Swipe between posts, pinch & double-tap zoom, swipe-down dismiss,
 * sample-first loading with Load Original button, video support, and preload
 */

import { ViewerGestureController } from '../utils/gestures.js';
import { Haptics, BackButton, shareMedia, downloadMedia, setImageSrc } from '../utils/capacitor.js';
import { isFavorite, addFavorite, removeFavorite, addHistory } from '../store.js';
import { t } from '../utils/i18n.js';

export class ViewerController {
  constructor(app) {
    this.app = app;
    this.isOpen = false;
    this.posts = [];
    this.currentIndex = 0;
    this.gestureController = null;
    this.uiVisible = true;
    this.uiTimeout = null;
  }

  init() {
    this.viewerEl = document.getElementById('media-viewer');
    this.headerEl = document.getElementById('viewer-header');
    this.bottomBarEl = document.getElementById('viewer-bottom-bar');
    this.stageEl = document.getElementById('viewer-stage');
    this.indexTag = document.getElementById('viewer-index-tag');
    this.btnBack = document.getElementById('btn-viewer-back');
    this.btnFav = document.getElementById('btn-viewer-fav');
    this.btnShare = document.getElementById('btn-viewer-share');
    this.btnDownload = document.getElementById('btn-viewer-download');
    this.btnInfo = document.getElementById('btn-viewer-info');
    this.btnLoadOriginal = document.getElementById('btn-load-original');
    this.spinnerEl = document.getElementById('viewer-spinner');

    // UI actions
    this.btnBack?.addEventListener('click', () => this.close());
    this.btnInfo?.addEventListener('click', () => {
      Haptics.selection();
      const post = this.getCurrentPost();
      if (post) this.app.sheet.open(post);
    });
    this.btnFav?.addEventListener('click', () => this.toggleFavorite());
    this.btnShare?.addEventListener('click', () => this.shareCurrent());
    this.btnDownload?.addEventListener('click', () => this.downloadCurrent());
    this.btnLoadOriginal?.addEventListener('click', () => this.loadOriginalHD());

    // Single tap to toggle header/bottom bar visibility
    this.stageEl?.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('video')) return;
      this.toggleUI();
    });
  }

  open(posts, initialIndex = 0) {
    this.posts = posts;
    this.currentIndex = Math.max(0, Math.min(initialIndex, posts.length - 1));
    this.isOpen = true;
    this.uiVisible = true;
    this.headerEl?.classList.remove('hidden-ui');
    this.bottomBarEl?.classList.remove('hidden-ui');

    this.viewerEl?.classList.add('open');
    BackButton.push('viewer', () => this.close());

    this.renderCurrent();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.viewerEl?.classList.remove('open');
    this.stageEl.innerHTML = '';
    BackButton.remove('viewer');

    // Pause any playing videos
    const video = this.stageEl.querySelector('video');
    if (video) {
      video.pause();
      video.src = '';
    }
  }

  getCurrentPost() {
    return this.posts[this.currentIndex];
  }

  async renderCurrent() {
    const post = this.getCurrentPost();
    if (!post) return;

    // Record into history
    addHistory(post);

    // Update index tag
    if (this.indexTag) {
      this.indexTag.textContent = `${this.currentIndex + 1} / ${this.posts.length}`;
    }

    // Update Favorite Icon State
    const fav = await isFavorite(post.id);
    if (this.btnFav) {
      if (fav) {
        this.btnFav.classList.add('active');
        this.btnFav.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" width="22" height="22">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        `;
      } else {
        this.btnFav.classList.remove('active');
        this.btnFav.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22" stroke-width="2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
          </svg>
        `;
      }
    }

    // Check Data Saver or Image Quality Settings
    const prefersOriginal = this.app.settings.image_quality === 'original';
    const isOriginal = prefersOriginal || post.sample_url === post.file_url;

    // Update "Load Original" button
    if (this.btnLoadOriginal) {
      if (post.isVideo) {
        this.btnLoadOriginal.style.display = 'none';
      } else {
        this.btnLoadOriginal.style.display = 'flex';
        if (isOriginal) {
          this.btnLoadOriginal.classList.add('loaded');
          this.btnLoadOriginal.textContent = t('original_loaded');
        } else {
          this.btnLoadOriginal.classList.remove('loaded');
          this.btnLoadOriginal.textContent = t('load_original');
        }
      }
    }

    // Build stage media
    this.stageEl.innerHTML = '';
    const mediaWrapper = document.createElement('div');
    mediaWrapper.className = 'viewer-media-wrapper';

    if (this.spinnerEl) this.spinnerEl.style.display = 'block';

    if (post.isVideo) {
      const video = document.createElement('video');
      video.className = 'viewer-video';
      video.src = post.file_url;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.controls = true;
      video.onloadeddata = () => {
        if (this.spinnerEl) this.spinnerEl.style.display = 'none';
      };
      mediaWrapper.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.className = 'viewer-image';
      img.alt = post.tags;
      const initialSrc = prefersOriginal ? post.file_url : (post.sample_url || post.file_url);
      img.dataset.full = initialSrc === post.file_url ? '1' : '0';
      const candidates = [initialSrc, post.sample_url, post.file_url, post.preview_url]
        .filter((u, i, a) => u && a.indexOf(u) === i);
      const hideSpinner = () => {
        if (this.spinnerEl) this.spinnerEl.style.display = 'none';
      };
      setImageSrc(img, candidates, { onLoad: hideSpinner, onFail: hideSpinner });
      mediaWrapper.appendChild(img);
    }

    this.stageEl.appendChild(mediaWrapper);

    // Initialize gestures for zoom, pan, and swipe
    this.gestureController = new ViewerGestureController(mediaWrapper, {
      container: this.stageEl,
      onSwipeNext: () => this.next(),
      onSwipePrev: () => this.prev(),
      onDismiss: () => this.close()
    });

    // Preload next 2 images if not data saver
    if (!this.app.settings.data_saver) {
      this.preloadAdjacent();
    }
  }

  preloadAdjacent() {
    for (let i = 1; i <= 2; i++) {
      const nextPost = this.posts[this.currentIndex + i];
      if (nextPost && !nextPost.isVideo) {
        const preImg = new Image();
        preImg.src = nextPost.sample_url || nextPost.file_url;
      }
    }
  }

  next() {
    if (this.currentIndex < this.posts.length - 1) {
      this.currentIndex++;
      this.renderCurrent();
    } else {
      // Reached end of current batch, ask gallery to load more
      this.app.gallery.loadMore().then((hasMore) => {
        if (hasMore && this.currentIndex < this.posts.length - 1) {
          this.currentIndex++;
          this.renderCurrent();
        }
      });
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderCurrent();
    }
  }

  loadOriginalHD() {
    const post = this.getCurrentPost();
    if (!post || post.isVideo) return;

    const img = this.stageEl.querySelector('.viewer-image');
    if (img && img.dataset.full !== '1') {
      Haptics.impact('MEDIUM');
      if (this.spinnerEl) this.spinnerEl.style.display = 'block';
      setImageSrc(img, [post.file_url], {
        onLoad: () => {
          img.dataset.full = '1';
          if (this.spinnerEl) this.spinnerEl.style.display = 'none';
          this.btnLoadOriginal.classList.add('loaded');
          this.btnLoadOriginal.textContent = t('original_loaded');
          this.app.showToast(t('original_loaded'));
        },
        onFail: () => {
          if (this.spinnerEl) this.spinnerEl.style.display = 'none';
          this.app.showToast(t('network_error'));
        }
      });
    }
  }

  async toggleFavorite() {
    const post = this.getCurrentPost();
    if (!post) return;

    Haptics.impact('MEDIUM');
    const fav = await isFavorite(post.id);
    if (fav) {
      await removeFavorite(post.id);
      this.renderCurrent();
      this.app.showToast('Removed from favorites');
    } else {
      await addFavorite(post);
      this.renderCurrent();
      this.app.showToast('Added to favorites!');
    }
  }

  async shareCurrent() {
    const post = this.getCurrentPost();
    if (!post) return;
    Haptics.selection();
    const result = await shareMedia({
      title: `Gelbooru #${post.id}`,
      text: `Booru Post #${post.id} (Rating: ${post.rating})`,
      url: post.file_url
    });
    if (result === 'clipboard') {
      this.app.showToast(t('copied_to_clipboard'));
    }
  }

  async downloadCurrent() {
    const post = this.getCurrentPost();
    if (!post) return;

    Haptics.notification('SUCCESS');
    const ext = post.fileType || 'jpg';
    const filename = `gelbooru_${post.id}.${ext}`;
    
    this.app.showDownloadBubble(15, t('download_starting'));

    await downloadMedia(post.file_url, filename, (percent, msg) => {
      this.app.showDownloadBubble(percent, msg);
    });
  }

  toggleUI() {
    this.uiVisible = !this.uiVisible;
    if (this.uiVisible) {
      this.headerEl?.classList.remove('hidden-ui');
      this.bottomBarEl?.classList.remove('hidden-ui');
    } else {
      this.headerEl?.classList.add('hidden-ui');
      this.bottomBarEl?.classList.add('hidden-ui');
    }
  }
}
