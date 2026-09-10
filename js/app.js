import confetti from 'canvas-confetti';
import { soundEngine } from './audio.js';
import { ThreeScene } from './three-scene.js';

/**
 * Main Application Controller - Spin Luck
 * Manages game state, name pool, draw history, UI interactions,
 * celebration confetti bursts, and modal overlays.
 */

const DEFAULT_NAMES = [
  'Paresh',
  'Deepak',
  'Meet',
  'Pritam',
  'krish',
  'Kajal',
  'Trisha',
  'Khushi'
];

class SpinLuckApp {
  constructor() {
    this.names = [...DEFAULT_NAMES];
    this.drawnHistory = [];
    this.currentWinner = null;
    this.currentWinnerIndex = -1;
    this.soundEnabled = true;

    // Load persisted names or fallback to defaults
    this.loadState();

    this.scene = null;
    this.initUI();
    this.initScene();
    this.setupStreamlitBridge();
  }

  loadState() {
    if (window.__STREAMLIT_NAMES__ && Array.isArray(window.__STREAMLIT_NAMES__) && window.__STREAMLIT_NAMES__.length > 0) {
      this.names = [...window.__STREAMLIT_NAMES__];
      return;
    }
    try {
      const savedNames = localStorage.getItem('spin_luck_names');
      if (savedNames) {
        const parsed = JSON.parse(savedNames);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.names = parsed;
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    this.names = [...DEFAULT_NAMES];
  }

  notifyStreamlit(payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          isStreamlitMessage: true,
          type: "streamlit:setComponentValue",
          value: payload
        }, "*");
      }
    } catch (e) {
      console.debug('Streamlit bridge notice:', e);
    }
  }

  setupStreamlitBridge() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          isStreamlitMessage: true,
          type: "streamlit:componentReady",
          apiVersion: 1
        }, "*");

        const setFrameHeight = () => {
          window.parent.postMessage({
            isStreamlitMessage: true,
            type: "streamlit:setFrameHeight",
            height: 870
          }, "*");
        };
        setFrameHeight();
        window.addEventListener('resize', setFrameHeight);
      }
    } catch (e) {}

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'streamlit:render' && data.args) {
        const args = data.args;
        if (args.names && Array.isArray(args.names) && args.names.length > 0) {
          const currentStr = JSON.stringify(this.names);
          const newStr = JSON.stringify(args.names);
          if (currentStr !== newStr) {
            this.names = [...args.names];
            this.saveState();
            if (this.scene) {
              this.scene.setNames(this.names);
            }
            this.renderNamesList();
            this.updateHUD();
          }
        }
      }

      if (data.action === 'spin_luck:draw') {
        this.drawLuckyChit();
      } else if (data.action === 'spin_luck:shuffle') {
        if (this.scene) this.scene.shuffleChits();
      } else if (data.action === 'spin_luck:set_names' && Array.isArray(data.names)) {
        this.names = [...data.names];
        this.saveState();
        if (this.scene) this.scene.setNames(this.names);
        this.renderNamesList();
        this.updateHUD();
      }
    });
  }

  saveState() {
    try {
      localStorage.setItem('spin_luck_names', JSON.stringify(this.names));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  initScene() {
    const canvasContainer = document.getElementById('webgl-container');
    this.scene = new ThreeScene(canvasContainer, (winnerName, winnerIndex) => {
      this.onChitRevealed(winnerName, winnerIndex);
    });

    // Populate bowl with chits
    this.scene.setNames(this.names);
    this.updateHUD();
  }

  initUI() {
    // 1. Action Buttons
    const drawBtn = document.getElementById('draw-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const manageBtn = document.getElementById('manage-btn');
    const historyBtn = document.getElementById('history-btn');
    const soundBtn = document.getElementById('sound-toggle');
    const resetNamesBtn = document.getElementById('reset-default-btn');
    const addNameForm = document.getElementById('add-name-form');
    const newNameInput = document.getElementById('new-name-input');

    // Camera view buttons
    document.querySelectorAll('.cam-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playClick();
        document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        this.scene.setCameraPreset(view);
      });
    });

    // Draw Trigger
    drawBtn.addEventListener('click', () => this.drawLuckyChit());

    // Shuffle
    shuffleBtn.addEventListener('click', () => {
      soundEngine.playClick();
      this.scene.shuffleChits();
    });

    // Sound toggle
    soundBtn.addEventListener('click', () => {
      this.soundEnabled = soundEngine.toggleSound();
      this.updateSoundBtnUI();
      soundEngine.playClick();
    });

    // Drawers
    manageBtn.addEventListener('click', () => this.openDrawer('manage-drawer'));
    historyBtn.addEventListener('click', () => this.openDrawer('history-drawer'));

    document.querySelectorAll('.drawer-close, .drawer-backdrop').forEach(el => {
      el.addEventListener('click', () => this.closeAllDrawers());
    });

    // Add Name
    addNameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = newNameInput.value.trim();
      if (val) {
        this.addName(val);
        newNameInput.value = '';
        soundEngine.playClick();
      }
    });

    // Reset to defaults
    resetNamesBtn.addEventListener('click', () => {
      soundEngine.playClick();
      this.names = [...DEFAULT_NAMES];
      this.saveState();
      this.scene.setNames(this.names);
      this.renderNamesList();
      this.updateHUD();
      this.showToast('Reset to default 8 names! (Paresh, Deepak, Meet...)');
      this.notifyStreamlit({
        action: 'names_updated',
        names: [...this.names],
        timestamp: Date.now()
      });
    });

    // Screen-Centered Chit Modal Actions
    const closeScreenChit = () => {
      this.closeScreenChitModal();
      this.scene.resetRevealedPaper();
    };

    document.getElementById('winner-draw-again').addEventListener('click', () => {
      soundEngine.playClick();
      closeScreenChit();
    });

    document.getElementById('winner-remove-draw').addEventListener('click', () => {
      soundEngine.playClick();
      if (this.currentWinnerIndex >= 0 && this.currentWinnerIndex < this.names.length) {
        const removed = this.names.splice(this.currentWinnerIndex, 1);
        this.saveState();
        this.scene.setNames(this.names);
        this.renderNamesList();
        this.updateHUD();
        this.showToast(`Removed "${removed[0]}" from bowl!`);
        this.notifyStreamlit({
          action: 'remove_winner',
          winner: removed[0],
          names: [...this.names],
          timestamp: Date.now()
        });
      }
      closeScreenChit();
    });

    document.getElementById('winner-copy-btn').addEventListener('click', () => {
      if (this.currentWinner) {
        navigator.clipboard.writeText(this.currentWinner);
        soundEngine.playClick();
        this.showToast(`Copied "${this.currentWinner}" to clipboard!`);
      }
    });

    const closeBtn = document.getElementById('screen-chit-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      soundEngine.playClick();
      closeScreenChit();
    });

    const backdrop = document.getElementById('screen-chit-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => {
      closeScreenChit();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('screen-chit-modal');
        if (modal && modal.classList.contains('active')) {
          closeScreenChit();
        }
      }
    });

    // Initial renders
    this.renderNamesList();
    this.renderHistoryList();
    this.updateSoundBtnUI();
  }

  drawLuckyChit() {
    if (this.scene.isAnimating) return;

    if (this.names.length === 0) {
      this.showToast('The bowl is empty! Add names or reset defaults.');
      soundEngine.playGlassClink(0.4);
      return;
    }

    // Pick a random index
    const randomIndex = Math.floor(Math.random() * this.names.length);
    const chosenName = this.names[randomIndex];

    this.currentWinner = chosenName;
    this.currentWinnerIndex = randomIndex;

    // Lock UI draw button
    const drawBtn = document.getElementById('draw-btn');
    drawBtn.classList.add('disabled');
    drawBtn.innerHTML = `
      <span class="btn-spinner"></span>
      <span>Picking Lucky Chit...</span>
    `;

    // Start 3D Levitation Animation (Hand Removed!)
    this.scene.playPickAnimation(randomIndex, chosenName);
  }

  /**
   * Called when the 3D chit levitates up to the screen
   * Starts the grand On-Screen Chit Opening Sequence!
   */
  onChitRevealed(winnerName, winnerIndex) {
    // Record into history
    const record = {
      name: winnerName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString()
    };
    this.drawnHistory.unshift(record);
    this.renderHistoryList();

    // Start Screen Chit Opening sequence
    this.startScreenChitOpening(winnerName);

    // Send update to Streamlit
    this.notifyStreamlit({
      action: 'draw',
      winner: winnerName,
      index: winnerIndex,
      remaining_count: this.names.length,
      history: this.drawnHistory,
      timestamp: Date.now()
    });

    // Reset draw button state
    const drawBtn = document.getElementById('draw-btn');
    drawBtn.classList.remove('disabled');
    drawBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
      <span>Draw Lucky Chit / पर्ची निकालें</span>
    `;
  }

  /**
   * ON-SCREEN CHIT OPENING SEQUENCE:
   * Multi-stage realistic paper unfolding right on screen!
   */
  startScreenChitOpening(name) {
    const modal = document.getElementById('screen-chit-modal');
    const wrapper = document.getElementById('chit-interactive-wrapper');
    const nameEl = document.getElementById('screen-winner-name');
    const countLeftEl = document.getElementById('screen-bowl-count');

    nameEl.textContent = name;
    countLeftEl.textContent = `${this.names.length} chits in bowl`;

    // Reset state to tightly folded
    wrapper.className = 'chit-wrapper state-folded';

    // Show modal overlay
    modal.classList.add('active');

    // Stage 1: Golden Seal Breaks
    setTimeout(() => {
      wrapper.classList.add('seal-broken');
      soundEngine.playPaperPick();
    }, 450);

    // Stage 2: Top Flap Flips Open Upward
    setTimeout(() => {
      wrapper.classList.add('state-unfolding', 'open-top');
      soundEngine.playPaperUnfoldStage(1);
    }, 850);

    // Stage 3: Bottom Flap Flips Open Downward
    setTimeout(() => {
      wrapper.classList.add('open-bottom');
      soundEngine.playPaperUnfoldStage(2);
    }, 1300);

    // Stage 4: Full Regal Parchment Revealed & Grand Celebration!
    setTimeout(() => {
      wrapper.classList.add('state-open');
      soundEngine.playWinFanfare();
      soundEngine.playConfettiPop();
      this.triggerConfetti();
    }, 1800);
  }

  closeScreenChitModal() {
    const modal = document.getElementById('screen-chit-modal');
    const wrapper = document.getElementById('chit-interactive-wrapper');
    if (modal) modal.classList.remove('active');
    if (wrapper) {
      setTimeout(() => {
        wrapper.className = 'chit-wrapper state-folded';
      }, 400);
    }
  }

  triggerConfetti() {
    const count = 200;
    const defaults = {
      origin: { y: 0.6 },
      spread: 95,
      ticks: 350,
      gravity: 0.85,
      decay: 0.92,
      startVelocity: 44,
      colors: ['#ffd700', '#ffaa00', '#d4af37', '#ffffff', '#e63946', '#3a86ff', '#8338ec']
    };

    confetti({ ...defaults, particleCount: Math.floor(count * 0.4), angle: 60, origin: { x: 0.15, y: 0.6 } });
    confetti({ ...defaults, particleCount: Math.floor(count * 0.4), angle: 120, origin: { x: 0.85, y: 0.6 } });
    confetti({ ...defaults, particleCount: Math.floor(count * 0.5), angle: 90, spread: 115 });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0.45 },
        colors: ['#ffe066', '#ffffff', '#ffd166', '#ffb703'],
        shapes: ['star', 'circle']
      });
    }, 450);
  }

  addName(name) {
    this.names.push(name);
    this.saveState();
    this.scene.setNames(this.names);
    this.renderNamesList();
    this.updateHUD();
    this.showToast(`Added "${name}" to bowl!`);
    this.notifyStreamlit({
      action: 'names_updated',
      names: [...this.names],
      timestamp: Date.now()
    });
  }

  removeName(index) {
    const removed = this.names.splice(index, 1);
    this.saveState();
    this.scene.setNames(this.names);
    this.renderNamesList();
    this.updateHUD();
    soundEngine.playClick();
    this.showToast(`Removed "${removed[0]}"`);
    this.notifyStreamlit({
      action: 'names_updated',
      names: [...this.names],
      timestamp: Date.now()
    });
  }

  renderNamesList() {
    const listEl = document.getElementById('names-chip-list');
    const countBadge = document.getElementById('names-drawer-count');

    countBadge.textContent = `${this.names.length} Names`;

    if (this.names.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>The bowl is empty! Add names above or click "Reset to Default Names".</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.names.map((n, idx) => `
      <div class="name-chip">
        <span class="chip-num">${idx + 1}</span>
        <span class="chip-name">${n}</span>
        <button class="chip-del" data-index="${idx}" title="Remove name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('.chip-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.dataset.index, 10);
        this.removeName(idx);
      });
    });
  }

  renderHistoryList() {
    const listEl = document.getElementById('history-list');
    const countBadge = document.getElementById('history-drawer-count');

    countBadge.textContent = `${this.drawnHistory.length} Drawn`;

    if (this.drawnHistory.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No lucky chits drawn yet. Click the glass bowl or "Draw Lucky Chit" to pick a winner!</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.drawnHistory.map((item, idx) => `
      <div class="history-card ${idx === 0 ? 'latest' : ''}">
        <div class="history-badge">#${this.drawnHistory.length - idx}</div>
        <div class="history-info">
          <div class="history-name">${item.name}</div>
          <div class="history-time">⏰ ${item.time} • ${item.date}</div>
        </div>
        ${idx === 0 ? '<span class="latest-tag">Latest Pick</span>' : ''}
      </div>
    `).join('');
  }

  updateHUD() {
    const hudBadge = document.getElementById('hud-chit-count');
    if (hudBadge) {
      hudBadge.textContent = `${this.names.length} Chits Inside`;
    }
  }

  updateSoundBtnUI() {
    const btn = document.getElementById('sound-toggle');
    if (this.soundEnabled) {
      btn.classList.add('active');
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        <span>Sound ON</span>
      `;
    } else {
      btn.classList.remove('active');
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
        <span>Muted</span>
      `;
    }
  }

  openDrawer(drawerId) {
    soundEngine.playClick();
    this.closeAllDrawers();
    const drawer = document.getElementById(drawerId);
    if (drawer) drawer.classList.add('active');
  }

  closeAllDrawers() {
    document.querySelectorAll('.app-drawer').forEach(d => d.classList.remove('active'));
  }

  showToast(msg) {
    const toast = document.getElementById('app-toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3200);
  }
}

// Initialize on DOM load or module evaluation
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    window.spinLuckApp = new SpinLuckApp();
  });
} else {
  window.spinLuckApp = new SpinLuckApp();
}
