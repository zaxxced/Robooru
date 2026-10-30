/**
 * 18+ Age Gate & 4-Digit PIN Lock Screen Controller
 */

import { Haptics, BackButton } from '../utils/capacitor.js';
import { getFromStore, putToStore } from '../store.js';
import { t } from '../utils/i18n.js';

export class GateController {
  constructor(app) {
    this.app = app;
    this.enteredPin = '';
    this.targetPin = '';
    this.pinCallback = null;
    this.isSettingPin = false;
  }

  init() {
    this.ageModal = document.getElementById('age-gate-modal');
    this.pinModal = document.getElementById('pin-lock-modal');
    this.pinTitle = document.getElementById('pin-modal-title');
    this.pinDots = document.querySelectorAll('.pin-dot');

    // Bind Age Gate buttons
    const btnAccept = document.getElementById('btn-age-accept');
    const btnDecline = document.getElementById('btn-age-decline');

    btnAccept?.addEventListener('click', async () => {
      Haptics.impact('MEDIUM');
      await putToStore('settings', true, 'age_gate_passed');
      this.app.settings.age_gate_passed = true;
      this.ageModal?.classList.remove('open');
      BackButton.remove('age-gate');
    });

    btnDecline?.addEventListener('click', () => {
      Haptics.impact('HEAVY');
      window.location.href = 'https://www.google.com';
    });

    // Bind PIN Keypad
    document.querySelectorAll('.pin-key').forEach((key) => {
      key.addEventListener('click', () => {
        const val = key.getAttribute('data-key');
        if (val === 'backspace') {
          this.handlePinBackspace();
        } else if (val) {
          this.handlePinInput(val);
        }
      });
    });
  }

  checkAgeGate() {
    if (!this.app.settings.age_gate_passed) {
      this.ageModal?.classList.add('open');
      BackButton.push('age-gate', () => {
        // Prevent dismissal until accepted
        this.ageModal?.classList.add('open');
      });
      return false;
    }
    return true;
  }

  checkPinLock() {
    if (this.app.settings.pin_enabled && this.app.settings.pin_code) {
      this.showPinPrompt({
        title: t('pin_enter'),
        targetPin: this.app.settings.pin_code,
        onSuccess: () => {
          this.pinModal?.classList.remove('open');
          BackButton.remove('pin-lock');
        }
      });
      return false;
    }
    return true;
  }

  showPinPrompt({ title, targetPin = null, onSuccess }) {
    this.enteredPin = '';
    this.targetPin = targetPin;
    this.pinCallback = onSuccess;
    this.isSettingPin = !targetPin;
    if (this.pinTitle) this.pinTitle.textContent = title;
    this.updatePinDots();
    this.pinModal?.classList.add('open');

    BackButton.push('pin-lock', () => {
      if (this.app.settings.pin_enabled && !this.isSettingPin) {
        // Prevent bypassing lock
      } else {
        this.pinModal?.classList.remove('open');
      }
    });
  }

  handlePinInput(num) {
    if (this.enteredPin.length < 4) {
      Haptics.selection();
      this.enteredPin += num;
      this.updatePinDots();

      if (this.enteredPin.length === 4) {
        setTimeout(() => this.verifyPin(), 120);
      }
    }
  }

  handlePinBackspace() {
    if (this.enteredPin.length > 0) {
      Haptics.selection();
      this.enteredPin = this.enteredPin.slice(0, -1);
      this.updatePinDots();
    }
  }

  updatePinDots() {
    this.pinDots.forEach((dot, idx) => {
      if (idx < this.enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  verifyPin() {
    if (this.isSettingPin) {
      // User is defining a new PIN
      Haptics.notification('SUCCESS');
      if (this.pinCallback) this.pinCallback(this.enteredPin);
      this.pinModal?.classList.remove('open');
      BackButton.remove('pin-lock');
    } else {
      // Verifying existing PIN
      if (this.enteredPin === this.targetPin) {
        Haptics.notification('SUCCESS');
        if (this.pinCallback) this.pinCallback();
        this.pinModal?.classList.remove('open');
        BackButton.remove('pin-lock');
      } else {
        Haptics.notification('ERROR');
        this.app.showToast(t('pin_incorrect'));
        this.enteredPin = '';
        this.updatePinDots();
      }
    }
  }
}
