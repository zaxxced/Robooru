/**
 * Touch Gestures Engine
 * Handles pinch-to-zoom, pan, double-tap, horizontal post swiping, swipe-down dismiss, and pull-to-refresh
 */

import { Haptics } from './capacitor.js';

export class ViewerGestureController {
  constructor(element, options = {}) {
    this.el = element; // the image/video media wrapper
    this.container = options.container || element.parentElement;
    this.onSwipeNext = options.onSwipeNext || (() => {});
    this.onSwipePrev = options.onSwipePrev || (() => {});
    this.onDismiss = options.onDismiss || (() => {});
    this.onTap = options.onTap || (() => {});

    this.scale = 1;
    this.minScale = 1;
    this.maxScale = 4;
    this.posX = 0;
    this.posY = 0;

    // Gesture tracking state
    this.startX = 0;
    this.startY = 0;
    this.lastTouchTime = 0;
    this.isPanning = false;
    this.isPinching = false;
    this.initialPinchDistance = 0;
    this.initialScale = 1;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.dragDownY = 0;

    this.bindEvents();
  }

  bindEvents() {
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.container.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
  }

  getDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  handleTouchStart(e) {
    if (e.touches.length === 2) {
      // Pinch started
      this.isPinching = true;
      this.initialPinchDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.initialScale = this.scale;
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.startX = touch.clientX - this.posX;
      this.startY = touch.clientY - this.posY;
      this.swipeStartX = touch.clientX;
      this.swipeStartY = touch.clientY;
      this.dragDownY = 0;

      // Check double tap
      const now = Date.now();
      if (now - this.lastTouchTime < 300) {
        this.handleDoubleTap(touch);
        this.lastTouchTime = 0;
        e.preventDefault();
        return;
      }
      this.lastTouchTime = now;
      this.isPanning = true;
    }
  }

  handleTouchMove(e) {
    if (this.isPinching && e.touches.length === 2) {
      const currentDist = this.getDistance(e.touches[0], e.touches[1]);
      if (this.initialPinchDistance > 0) {
        const factor = currentDist / this.initialPinchDistance;
        let newScale = this.initialScale * factor;
        newScale = Math.max(0.8, Math.min(newScale, this.maxScale));
        this.scale = newScale;
        this.applyTransform();
      }
      e.preventDefault();
      return;
    }

    if (this.isPanning && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.swipeStartX;
      const deltaY = touch.clientY - this.swipeStartY;

      // If at 1x scale, support swipe down to dismiss and horizontal swipe between posts
      if (this.scale <= 1) {
        // Vertical drag down
        if (deltaY > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
          this.dragDownY = deltaY;
          const dismissScale = Math.max(0.7, 1 - deltaY / 1000);
          const opacity = Math.max(0.2, 1 - deltaY / 400);
          this.el.style.transform = `translate3d(0, ${deltaY}px, 0) scale(${dismissScale})`;
          this.container.parentElement.style.backgroundColor = `rgba(0,0,0,${opacity})`;
          e.preventDefault();
          return;
        }

        // Horizontal swipe preview
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          this.posX = deltaX * 0.4;
          this.el.style.transform = `translate3d(${this.posX}px, 0, 0)`;
          e.preventDefault();
          return;
        }
      } else {
        // Pan zoomed image
        this.posX = touch.clientX - this.startX;
        this.posY = touch.clientY - this.startY;
        this.applyTransform();
        e.preventDefault();
      }
    }
  }

  handleTouchEnd(e) {
    if (this.isPinching) {
      this.isPinching = false;
      if (this.scale < 1) {
        this.resetZoom();
      }
      return;
    }

    if (this.isPanning) {
      this.isPanning = false;

      // If dragging down to dismiss
      if (this.dragDownY > 120 && this.scale <= 1) {
        Haptics.impact('LIGHT');
        this.onDismiss();
        this.resetZoom();
        return;
      }

      // If at 1x, check for swipe between posts
      if (this.scale <= 1) {
        const deltaX = this.posX / 0.4;
        if (deltaX < -70) {
          // Swipe Next
          Haptics.selection();
          this.resetZoom();
          this.onSwipeNext();
          return;
        } else if (deltaX > 70) {
          // Swipe Prev
          Haptics.selection();
          this.resetZoom();
          this.onSwipePrev();
          return;
        }
      }

      // Snap back if dismissed cancelled
      this.resetZoom();
    }
  }

  handleDoubleTap(touch) {
    Haptics.selection();
    if (this.scale > 1) {
      this.resetZoom();
    } else {
      this.scale = 2.5;
      this.posX = 0;
      this.posY = 0;
      this.applyTransform();
    }
  }

  applyTransform() {
    this.el.style.transition = 'none';
    this.el.style.transform = `translate3d(${this.posX}px, ${this.posY}px, 0) scale(${this.scale})`;
  }

  resetZoom() {
    this.scale = 1;
    this.posX = 0;
    this.posY = 0;
    this.dragDownY = 0;
    this.el.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    this.el.style.transform = `translate3d(0, 0, 0) scale(1)`;
    if (this.container.parentElement) {
      this.container.parentElement.style.backgroundColor = '#000000';
    }
  }
}

/**
 * Pull to Refresh Handler for Gallery
 */
export class PullToRefresh {
  constructor(scrollEl, indicatorEl, onRefresh) {
    this.scrollEl = scrollEl;
    this.indicatorEl = indicatorEl;
    this.onRefresh = onRefresh;
    this.startY = 0;
    this.currentY = 0;
    this.isPulling = false;
    this.threshold = 70;

    this.bindEvents();
  }

  bindEvents() {
    this.scrollEl.addEventListener('touchstart', (e) => {
      if (this.scrollEl.scrollTop <= 0) {
        this.startY = e.touches[0].clientY;
        this.isPulling = true;
      }
    }, { passive: true });

    this.scrollEl.addEventListener('touchmove', (e) => {
      if (!this.isPulling) return;
      const y = e.touches[0].clientY;
      const pull = y - this.startY;

      if (pull > 0 && this.scrollEl.scrollTop <= 0) {
        // Resistance curve
        const height = Math.min(pull * 0.45, 90);
        this.indicatorEl.style.height = `${height}px`;
        const spinner = this.indicatorEl.querySelector('.ptr-spinner');
        if (spinner) {
          spinner.style.transform = `rotate(${height * 4}deg)`;
        }
      } else {
        this.isPulling = false;
        this.indicatorEl.style.height = '0px';
      }
    }, { passive: true });

    const finishPull = async () => {
      if (!this.isPulling) return;
      this.isPulling = false;
      const currentHeight = parseFloat(this.indicatorEl.style.height || '0');

      if (currentHeight >= 45) {
        Haptics.impact('MEDIUM');
        this.indicatorEl.classList.add('refreshing');
        this.indicatorEl.style.height = '50px';
        try {
          await this.onRefresh();
        } finally {
          this.indicatorEl.classList.remove('refreshing');
          this.indicatorEl.style.height = '0px';
        }
      } else {
        this.indicatorEl.style.height = '0px';
      }
    };

    this.scrollEl.addEventListener('touchend', finishPull, { passive: true });
    this.scrollEl.addEventListener('touchcancel', finishPull, { passive: true });
  }
}
