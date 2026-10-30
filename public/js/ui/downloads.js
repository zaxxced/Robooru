/**
 * Floating download manager
 * Keeps the five most recent downloads and their live progress.
 */

export class DownloadsController {
  constructor() {
    this.items = [];
    this.nextId = 1;
    this.isOpen = false;
  }

  init() {
    this.button = document.getElementById('download-fab');
    this.popup = document.getElementById('download-popup');
    this.list = document.getElementById('download-list');
    this.count = document.getElementById('download-count');
    this.closeButton = document.getElementById('download-popup-close');

    this.button?.addEventListener('click', () => this.toggle());
    this.closeButton?.addEventListener('click', () => this.setOpen(false));
    document.addEventListener('click', (event) => {
      if (this.isOpen && !event.target.closest('#download-popup') && !event.target.closest('#download-fab')) {
        this.setOpen(false);
      }
    });
    this.render();
  }

  start(filename) {
    const item = {
      id: this.nextId++,
      filename,
      percent: 0,
      message: 'Starting download…',
      status: 'active',
      createdAt: Date.now()
    };
    this.items.unshift(item);
    this.items = this.items.slice(0, 5);
    this.render();
    this.setOpen(true);
    return item.id;
  }

  update(id, percent, message, status = null) {
    const item = this.items.find(entry => entry.id === id);
    if (!item) return;
    item.percent = Math.max(0, Math.min(100, Number(percent) || 0));
    item.message = message || item.message;
    if (status) item.status = status;
    else if (item.percent >= 100) item.status = 'complete';
    this.render();
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
    this.list.innerHTML = this.items.map(item => {
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
