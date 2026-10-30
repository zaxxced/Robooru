/**
 * History Controller
 * Shows browsing history with timestamp, thumbnail, metadata, and clear options
 */

import { getHistory, clearHistory } from '../store.js';
import { Haptics } from '../utils/capacitor.js';
import { t } from '../utils/i18n.js';

const escapeAttr = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

export class HistoryController {
  constructor(app) {
    this.app = app;
    this.historyItems = [];
  }

  init() {
    this.historyList = document.getElementById('history-list');
    this.emptyState = document.getElementById('history-empty');
    this.btnClear = document.getElementById('btn-clear-history');

    this.btnClear?.addEventListener('click', async () => {
      Haptics.impact('MEDIUM');
      await clearHistory();
      this.app.showToast(t('hist_cleared'));
      await this.loadHistory();
    });
  }

  async activate() {
    await this.loadHistory();
  }

  async loadHistory() {
    const viewed = await getHistory();
    let downloaded = [];
    try {
      downloaded = JSON.parse(localStorage.getItem('robooru-download-history') || '[]')
        .filter(item => item.status === 'complete' && item.post)
        .map(item => ({
          id: item.post.id,
          viewed_at: item.completedAt || item.createdAt || Date.now(),
          post: { ...item.post, local_file_url: item.localUrl || '' },
          downloaded: true
        }));
    } catch {
      downloaded = [];
    }

    // Merge by post ID and show the newest activity first.
    const merged = new Map();
    [...viewed, ...downloaded].forEach(item => {
      const key = String(item.post?.id ?? item.id);
      const previous = merged.get(key);
      const newest = !previous || Number(item.viewed_at) > Number(previous.viewed_at) ? item : previous;
      const localUrl = item.post?.local_file_url || previous?.post?.local_file_url || '';
      merged.set(key, {
        ...newest,
        post: { ...(newest.post || {}), local_file_url: localUrl },
        downloaded: Boolean(item.downloaded || previous?.downloaded)
      });
    });
    this.historyItems = [...merged.values()]
      .sort((a, b) => Number(b.viewed_at) - Number(a.viewed_at));

    if (this.historyItems.length === 0) {
      if (this.emptyState) this.emptyState.style.display = 'flex';
      if (this.historyList) this.historyList.innerHTML = '';
      return;
    }

    if (this.emptyState) this.emptyState.style.display = 'none';
    this.renderHistoryList();
  }

  renderHistoryList() {
    if (!this.historyList) return;

    this.historyList.innerHTML = this.historyItems.map((item, idx) => {
      const p = item.post || {};
      const preview = p.local_file_url || p.preview_url || p.sample_url || p.file_url || '';
      const sample = p.sample_url || p.file_url || '';
      const original = p.file_url || '';
      const dateStr = new Date(item.viewed_at).toLocaleString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      const rating = String(p.rating || 'general').toUpperCase();

      return `
        <div class="settings-card history-card-item" data-idx="${idx}" style="cursor:pointer; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:12px; padding:10px 14px;">
            <div class="history-thumb-wrap" style="width:52px; height:52px; flex:0 0 52px; overflow:hidden; border-radius:var(--radius-sm); background:var(--bg-surface-elevated);">
              <img
                class="history-thumb"
                src="${escapeAttr(preview)}"
                data-sample="${escapeAttr(sample)}"
                data-original="${escapeAttr(original)}"
                alt="Post ${escapeAttr(p.id)}"
                loading="lazy"
                decoding="async"
                referrerpolicy="no-referrer"
                style="display:block; width:100%; height:100%; object-fit:cover;"
              />
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:4px; overflow:hidden;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-weight:700; font-size:0.92rem;">#${escapeAttr(p.id)}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${escapeAttr(dateStr)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="rating-badge rating-${escapeAttr(p.rating || 'general')}">${escapeAttr(rating)}</span>
                <span style="font-size:0.75rem; color:var(--text-secondary);">★ ${escapeAttr(p.score ?? 0)}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${escapeAttr(p.width || '—')}×${escapeAttr(p.height || '—')}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // If a preview URL is unavailable, retry the sample and then the original file.
    this.historyList.querySelectorAll('.history-thumb').forEach(img => {
      const tried = new Set([img.currentSrc || img.getAttribute('src')].filter(Boolean));
      img.addEventListener('error', () => {
        const next = [img.dataset.sample, img.dataset.original]
          .find(url => url && !tried.has(url));

        if (next) {
          tried.add(next);
          img.src = next;
        } else {
          img.style.visibility = 'hidden';
        }
      });

      img.addEventListener('load', () => {
        img.style.visibility = 'visible';
      }, { once: true });
    });

    this.historyList.querySelectorAll('.history-card-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number.parseInt(el.getAttribute('data-idx'), 10);
        const posts = this.historyItems.map(h => h.post);
        Haptics.selection();
        this.app.viewer.open(posts, idx);
      });
    });
  }
}
