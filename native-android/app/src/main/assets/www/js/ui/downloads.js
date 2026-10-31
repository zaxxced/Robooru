/**
 * Floating download manager
 * Keeps the five most recent downloads and their live progress.
 */

import { setImageSrc } from '../utils/capacitor.js';

const CAROUSEL_MAX = 20;

// Only the fields the viewer and the carousel need, to keep localStorage small
const compactPost = (post) => ({
  id: post.id,
  file_url: post.file_url,
  sample_url: post.sample_url,
  preview_url: post.preview_url,
  width: post.width,
  height: post.height,
  aspect_ratio: post.aspect_ratio,
  score: post.score,
  rating: post.rating,
  tags: post.tags,
  tagsArray: post.tagsArray,
  source: post.source,
  fileType: post.fileType,
  isVideo: post.isVideo,
  isGif: post.isGif
});

export class DownloadsController {
  constructor() {
    this.items = [];
    this.nextId = 1;
    this.isOpen = false;
    this.historyList = null;
    this.emptyState = null;
  }

  init() {
    this.button = document.getElementById('download-fab');
    this.popup = document.getElementById('download-popup');
    this.list = document.getElementById('download-list');
    this.count = document.getElementById('download-count');
    this.closeButton = document.getElementById('download-popup-close');
    this.historyList = document.getElementById('downloads-history-list');
    this.emptyState = document.getElementById('downloads-history-empty');
    try { this.items = JSON.parse(localStorage.getItem('robooru-download-history') || '[]'); } catch { this.items = []; }
    this.items = this.items.slice(0, 100);
    this.nextId = this.items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

    this.button?.addEventListener('click', () => this.toggle());
    this.closeButton?.addEventListener('click', () => this.setOpen(false));
    document.getElementById('btn-clear-download-history')?.addEventListener('click', () => { this.items = this.items.filter(item => item.status === 'active'); this.save(); this.render(); this.renderHistory(); });
    document.addEventListener('click', (event) => {
      if (this.isOpen && !event.target.closest('#download-popup') && !event.target.closest('#download-fab')) {
        this.setOpen(false);
      }
    });
    this.render();
    this.renderHistory();
  }

  start(filename, meta = {}) {
    const item = {
      id: this.nextId++,
      filename,
      percent: 0,
      message: 'Starting download…',
      status: 'active',
      createdAt: Date.now(),
      // Compact post data so the History carousel can show a preview and open the viewer
      thumb: meta.thumb || '',
      post: meta.post ? compactPost(meta.post) : null
    };
    this.items.unshift(item);
    this.items = this.items.slice(0, 100);
    this.save();
    this.render();
    this.renderHistory();
    return item.id;
  }

  update(id, percent, message, status = null, localUrl = '') {
    const item = this.items.find(entry => entry.id === id);
    if (!item) return;
    item.percent = Math.max(0, Math.min(100, Number(percent) || 0));
    item.message = message || item.message;
    if (status) item.status = status;
    else if (item.percent >= 100) item.status = 'complete';
    if (item.status === 'complete' && !item.completedAt) item.completedAt = Date.now();
    if (localUrl) item.localUrl = localUrl;
    this.save();
    this.render();
    this.renderHistory();
  }

  activate() { this.renderHistory(); }

  save() {
    try { localStorage.setItem('robooru-download-history', JSON.stringify(this.items.slice(0, 100))); } catch {}
  }

  renderCarousel() {
    const section = document.getElementById('dl-carousel');
    const list = document.getElementById('dl-carousel-list');
    if (!section || !list) return;

    // One card per post (newest first), only for downloads that carry post data
    const seen = new Set();
    const entries = [];
    for (const item of this.items) {
      if (!item.post || seen.has(item.post.id)) continue;
      seen.add(item.post.id);
      entries.push(item);
      if (entries.length >= CAROUSEL_MAX) break;
    }

    section.style.display = entries.length ? 'block' : 'none';

    // Progress updates call this often: rebuild only when the set of posts changes, so previews don't flicker
    // The key also records whether a local file exists, so the card is rebuilt once when a download finishes.
    const key = entries.map(e => `${e.post.id}:${e.localUrl ? 1 : 0}`).join(',');
    if (key === this.carouselKey && list.children.length === entries.length) return;
    this.carouselKey = key;
    list.innerHTML = '';

    entries.forEach((item, idx) => {
      // Rounded card: shimmer skeleton until the preview has loaded
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'dl-card skeleton';
      card.setAttribute('aria-label', `Post ${item.post.id}`);

      const img = document.createElement('img');
      img.className = 'dl-card-img';
      img.alt = '';
      img.decoding = 'async';

      const label = document.createElement('span');
      label.className = 'dl-card-label';
      label.textContent = `#${item.post.id}`;

      card.append(img, label);
      list.appendChild(card);

      // The downloaded file on the device comes first, so the card works offline.
      // Online sample is next (cards are large, the small preview would look blurry), then the preview.
      const candidates = [item.localUrl, item.post.sample_url, item.post.preview_url, item.thumb].filter(Boolean);
      setImageSrc(img, [...new Set(candidates)], {
        onLoad: () => {
          card.classList.remove('skeleton');
          img.classList.add('loaded');
        },
        onFail: () => {
          card.classList.remove('skeleton');
          card.classList.add('failed');
        }
      });

      card.addEventListener('click', () => {
        // The viewer prefers post.local_file_url, so hand it the local copy for every downloaded post
        const posts = entries.map(e => ({ ...e.post, local_file_url: e.localUrl || '' }));
        window.app?.viewer?.open(posts, idx);
      });
    });
  }

  renderHistory() {
    this.renderCarousel();
    if (!this.historyList) return;
    if (!this.items.length) {
      this.historyList.innerHTML = '';
      if (this.emptyState) this.emptyState.style.display = 'flex';
      return;
    }
    if (this.emptyState) this.emptyState.style.display = 'none';
    this.historyList.innerHTML = this.items.map(item => {
      const status = item.status === 'complete' ? 'Selesai' : item.status === 'failed' ? 'Gagal' : item.message || 'Mengunduh…';
      const percent = item.status === 'complete' ? 100 : item.percent || 0;
      const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : '';
      return `<div class="settings-card download-history-item" style="margin-bottom:8px;padding:12px 14px;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;"><strong style="font-size:.86rem;overflow-wrap:anywhere;">${this.escape(item.filename)}</strong><span style="font-size:.75rem;color:var(--text-muted);">${percent}%</span></div>
        <div class="download-progress-track"><div class="download-progress-fill" style="width:${percent}%"></div></div>
        <div class="download-status">${this.escape(status)} · ${this.escape(date)}</div>
      </div>`;
    }).join('');
  }

  toggle() {
    this.setOpen(!this.isOpen);
  }

  setOpen(open) {
    this.isOpen = open;
    this.popup?.classList.toggle('open', open);
    this.button?.classList.toggle('active', open);
    this.button?.setAttribute('aria-expanded', String(open));
  }

  render() {
    if (this.count) {
      const active = this.items.filter(item => item.status === 'active').length;
      this.count.textContent = active ? String(active) : '';
      this.count.classList.toggle('visible', active > 0);
    }
    if (!this.list) return;
    if (!this.items.length) {
      this.list.innerHTML = '<div class="download-empty">No downloads yet</div>';
      return;
    }
    this.list.innerHTML = this.items.slice(0, 5).map(item => {
      const statusLabel = item.status === 'complete' ? 'Completed'
        : item.status === 'failed' ? 'Failed'
        : item.message || 'Downloading…';
      const progress = item.status === 'complete' ? 100 : item.percent;
      return `
        <div class="download-item ${item.status}" data-download-id="${item.id}">
          <div class="download-item-top">
            <span class="download-file-name" title="${this.escape(item.filename)}">${this.escape(item.filename)}</span>
            <span class="download-percent">${item.status === 'failed' ? '!' : progress + '%'}</span>
          </div>
          <div class="download-progress-track">
            <div class="download-progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="download-status">${this.escape(statusLabel)}</div>
        </div>`;
    }).join('');
  }

  escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }
}
