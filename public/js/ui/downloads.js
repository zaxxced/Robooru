/**
 * Floating Downloads Widget
 * A round button at the bottom-left that opens a popup with the 5 most recent downloads
 * and live progress (read from Android's DownloadManager through window.BooruNative).
 */

import { BackButton, Haptics } from '../utils/capacitor.js';
import { t } from '../utils/i18n.js';

const STORAGE_KEY = 'booru_recent_downloads';
const MAX_ITEMS = 5;
const POLL_MS = 600;

// Android DownloadManager status codes
const DM = { PENDING: 1, RUNNING: 2, PAUSED: 4, SUCCESSFUL: 8, FAILED: 16 };

const isActive = (item) => item.status === 'pending' || item.status === 'running' || item.status === 'paused';

const formatBytes = (bytes) => {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export class DownloadsController {
  constructor(app) {
    this.app = app;
    this.items = [];
    this.isOpen = false;
    this.timer = null;
  }

  init() {
    this.widget = document.getElementById('downloads-widget');
    this.fab = document.getElementById('dl-fab');
    this.badge = document.getElementById('dl-badge');
    this.ring = this.fab?.querySelector('.dl-ring');
    this.popup = document.getElementById('dl-popup');
    this.listEl = document.getElementById('dl-list');
    this.clearBtn = document.getElementById('dl-clear');
    if (!this.widget || !this.fab || !this.popup || !this.listEl) return;

    this.load();

    this.fab.addEventListener('click', () => {
      Haptics.selection();
      this.setOpen(!this.isOpen);
    });

    this.clearBtn?.addEventListener('click', () => {
      // Keep downloads that are still running
      this.items = this.items.filter(isActive);
      this.save();
      this.render();
    });

    // Tap outside closes the popup
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.widget.contains(e.target)) {
        this.setOpen(false);
      }
    });

    this.render();
    this.poll(); // refresh states of anything persisted from last session
  }

  // ---------- Public API ----------

  /** Track a new download. `id` is the Android DownloadManager id (or null for browser downloads). */
  add({ id = null, name, thumb = '', status = 'running' }) {
    const item = {
      id,
      name,
      thumb,
      status,
      downloaded: 0,
      total: -1,
      time: Date.now()
    };
    this.items.unshift(item);
    this.items = this.items.slice(0, MAX_ITEMS);
    this.save();
    this.render();
    this.setOpen(true);
    this.startPolling();
  }

  // ---------- State ----------

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(raw)) this.items = raw.slice(0, MAX_ITEMS);
    } catch {
      this.items = [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch {
      // storage unavailable, keep in-memory only
    }
  }

  setOpen(open) {
    if (this.isOpen === open) return;
    this.isOpen = open;
    this.popup.classList.toggle('open', open);
    if (open) {
      BackButton.push('downloads-popup', () => {
        this.isOpen = false;
        this.popup.classList.remove('open');
      });
    } else {
      BackButton.remove('downloads-popup');
    }
  }

  // ---------- Polling native progress ----------

  startPolling() {
    if (this.timer) return;
    this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  stopPolling() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  poll() {
    const active = this.items.filter((it) => isActive(it) && it.id);
    if (active.length === 0) {
      this.stopPolling();
      return;
    }
    this.startPolling();

    const native = window.BooruNative;
    if (!native || typeof native.getDownloadStatus !== 'function') {
      this.stopPolling();
      return;
    }

    let rows = [];
    try {
      rows = JSON.parse(native.getDownloadStatus(active.map((it) => it.id).join(',')) || '[]');
    } catch {
      return;
    }

    const byId = new Map(rows.map((r) => [Number(r.id), r]));
    let structureChanged = false;

    for (const it of active) {
      const row = byId.get(Number(it.id));
      if (!row) {
        // DownloadManager no longer knows this download (removed by the user)
        it.status = 'failed';
        structureChanged = true;
        continue;
      }
      it.downloaded = row.downloaded;
      it.total = row.total;
      let next = it.status;
      if (row.status === DM.SUCCESSFUL) next = 'done';
      else if (row.status === DM.FAILED) next = 'failed';
      else if (row.status === DM.PAUSED) next = 'paused';
      else if (row.status === DM.PENDING) next = 'pending';
      else next = 'running';
      if (next !== it.status) structureChanged = true;
      it.status = next;
    }

    this.save();
    if (structureChanged) {
      this.render();
      if (active.every((it) => !isActive(it))) this.stopPolling();
    } else {
      this.updateProgress();
    }
  }

  // ---------- Rendering ----------

  percentOf(item) {
    if (item.status === 'done') return 100;
    if (item.total > 0) return Math.min(99, Math.round((item.downloaded / item.total) * 100));
    return 0;
  }

  metaText(item) {
    switch (item.status) {
      case 'done':
        return t('dl_done', 'Saved to Pictures/Booru');
      case 'failed':
        return t('dl_failed', 'Failed');
      case 'paused':
        return t('dl_paused', 'Paused');
      case 'pending':
        return t('dl_waiting', 'Waiting...');
      default: {
        const pct = this.percentOf(item);
        if (item.total > 0) {
          return `${pct}% · ${formatBytes(item.downloaded)} / ${formatBytes(item.total)}`;
        }
        return item.downloaded > 0 ? formatBytes(item.downloaded) : t('dl_waiting', 'Waiting...');
      }
    }
  }

  render() {
    this.listEl.innerHTML = '';

    if (this.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dl-empty';
      empty.textContent = t('downloads_empty', 'No recent downloads');
      this.listEl.appendChild(empty);
    }

    this.items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = `dl-item dl-${item.status}`;
      row.dataset.index = String(index);

      const thumb = document.createElement('img');
      thumb.className = 'dl-thumb';
      thumb.alt = '';
      thumb.referrerPolicy = 'no-referrer';
      if (item.thumb) thumb.src = item.thumb;
      row.appendChild(thumb);

      const info = document.createElement('div');
      info.className = 'dl-info';

      const name = document.createElement('div');
      name.className = 'dl-name';
      name.textContent = item.name;
      info.appendChild(name);

      const bar = document.createElement('div');
      bar.className = 'dl-bar';
      const fill = document.createElement('div');
      fill.className = 'dl-bar-fill';
      fill.style.width = `${this.percentOf(item)}%`;
      bar.appendChild(fill);
      info.appendChild(bar);

      const meta = document.createElement('div');
      meta.className = 'dl-meta';
      meta.textContent = this.metaText(item);
      info.appendChild(meta);

      row.appendChild(info);

      const mark = document.createElement('div');
      mark.className = 'dl-mark';
      mark.textContent = item.status === 'done' ? '✓' : item.status === 'failed' ? '✕' : '';
      row.appendChild(mark);

      this.listEl.appendChild(row);
    });

    this.updateFab();
  }

  /** Update bars and text in place (no DOM rebuild, so thumbnails do not flicker). */
  updateProgress() {
    this.listEl.querySelectorAll('.dl-item').forEach((row) => {
      const item = this.items[Number(row.dataset.index)];
      if (!item) return;
      const fill = row.querySelector('.dl-bar-fill');
      const meta = row.querySelector('.dl-meta');
      if (fill) fill.style.width = `${this.percentOf(item)}%`;
      if (meta) meta.textContent = this.metaText(item);
    });
    this.updateFab();
  }

  updateFab() {
    const active = this.items.filter(isActive);
    this.fab.classList.toggle('active', active.length > 0);
    if (this.badge) this.badge.textContent = String(active.length);
    if (this.ring) {
      const avg = active.length
        ? Math.round(active.reduce((sum, it) => sum + this.percentOf(it), 0) / active.length)
        : 0;
      this.ring.style.setProperty('--p', String(avg));
    }
  }
}
