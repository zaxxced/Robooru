/**
 * History Controller
 * Shows browsing history with timestamp, thumbnail, metadata, and clear options
 */

import { getHistory, clearHistory } from '../store.js';
import { Haptics } from '../utils/capacitor.js';
import { t } from '../utils/i18n.js';

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
    const raw = await getHistory();
    this.historyItems = raw;

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
      const p = item.post;
      const dateStr = new Date(item.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="settings-card history-card-item" data-idx="${idx}" style="cursor:pointer; margin-bottom: 8px;">
          <div style="display:flex; align-items:center; gap:12px; padding:10px 14px;">
            <img 
              src="${p.preview_url || p.sample_url}" 
              alt="Post ${p.id}" 
              style="width:52px; height:52px; object-fit:cover; border-radius:var(--radius-sm); background:var(--bg-surface-elevated);"
            />
            <div style="flex:1; display:flex; flex-direction:column; gap:4px; overflow:hidden;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-weight:700; font-size:0.92rem;">#${p.id}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${dateStr}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="rating-badge rating-${p.rating}">${p.rating.toUpperCase()}</span>
                <span style="font-size:0.75rem; color:var(--text-secondary);">★ ${p.score}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${p.width}×${p.height}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.historyList.querySelectorAll('.history-card-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-idx'), 10);
        const posts = this.historyItems.map(h => h.post);
        Haptics.selection();
        this.app.viewer.open(posts, idx);
      });
    });
  }
}
