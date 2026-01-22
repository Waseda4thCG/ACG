/**
 * モダンでスタイリッシュな統一UI
 */
export class MovementUI {
  constructor(environmentManager = null) {
    this.container = null;
    this.currentMode = 'free';
    this.environmentManager = environmentManager; // SSOT for environment
    this.environments = ['Urban', 'Nature', 'CyberPunk', 'Underwater']; // 利用可能な環境リスト
    this.onEnvironmentChange = null;
    this.onFlightModeChange = null;
    this.onControlModeChange = null; // 操作モード変更時のコールバック
    this.currentControlMode = 'keyboard'; // 'keyboard' or 'mouseOnly'
    this.isOpen = true; // サイドバーが開いているか
    this._createUI();
    this._attachKeyboardListener();
  }

  _createUI() {
    this.container = document.createElement('div');
    this.container.id = 'unified-ui';
    this.container.innerHTML = `
      <!-- ハンバーガーメニュー -->
      <div class="hamburger-menu" id="hamburger-menu">
        <div class="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="hamburger-hint">Press M</div>
      </div>

      <!-- サイドバーコンテンツ -->
      <div class="sidebar-content" id="sidebar-content">
        <!-- ヘッダー -->
        <div class="ui-header">
        <div class="app-title">
          <div class="title-icon">
            <img src="/icon.png" alt="もしリコ" class="icon-img">
          </div>
          <div class="title-content">
            <div class="title-text">もしリコ</div>
            <div class="title-subtitle">～もしもリコキャンが⚪︎⚪︎だったら～</div>
          </div>
        </div>
      </div>

      <!-- Flight Mode選択 -->
      <div class="flight-mode-section">
        <div class="section-label">Flight Mode</div>
        <div class="flight-mode-buttons">
          <button class="flight-btn active" data-mode="free">
            <span class="flight-icon">✈️</span>
            <div class="flight-info">
              <div class="flight-name">Free Flight</div>
              <div class="flight-desc">Fly anywhere</div>
            </div>
            <span class="flight-check">✓</span>
          </button>
          <button class="flight-btn" data-mode="grounded">
            <span class="flight-icon">🚶</span>
            <div class="flight-info">
              <div class="flight-name">Grounded</div>
              <div class="flight-desc">Walk on floor</div>
            </div>
            <span class="flight-check">✓</span>
          </button>
        </div>
        <div class="flight-hint">Press <kbd>G</kbd> to toggle</div>
      </div>

      <!-- Control Mode選択 -->
      <div class="control-mode-section">
        <div class="section-label">Control Mode</div>
        <div class="control-mode-buttons">
          <button class="control-mode-btn active" data-control="keyboard">
            <span class="control-icon">⌨️</span>
            <div class="control-info">
              <div class="control-mode-name">Keyboard</div>
              <div class="control-mode-desc">WASD + Mouse</div>
            </div>
            <span class="control-check">✓</span>
          </button>
          <button class="control-mode-btn" data-control="mouseOnly">
            <span class="control-icon">🖱️</span>
            <div class="control-info">
              <div class="control-mode-name">Mouse Only</div>
              <div class="control-mode-desc">Orbit + Pan + Zoom</div>
            </div>
            <span class="control-check">✓</span>
          </button>
        </div>
      </div>

      <!-- 環境選択 -->
      <div class="environment-section">
        <div class="section-header">
          <div class="section-label">Environment</div>
          <div class="section-hint">Press <kbd>E</kbd></div>
        </div>
        <div class="environment-list">
          <button class="env-btn active" data-env="Urban">
            <span class="env-icon">🏙️</span>
            <span class="env-name">Urban</span>
            <span class="env-check">✓</span>
          </button>
          <button class="env-btn" data-env="Nature">
            <span class="env-icon">🌿</span>
            <span class="env-name">Nature</span>
            <span class="env-check">✓</span>
          </button>
          <button class="env-btn" data-env="CyberPunk">
            <span class="env-icon">🤖</span>
            <span class="env-name">CyberPunk</span>
            <span class="env-check">✓</span>
          </button>
          <button class="env-btn" data-env="Underwater">
            <span class="env-icon">🌊</span>
            <span class="env-name">Underwater</span>
            <span class="env-check">✓</span>
          </button>
        </div>
      </div>
      </div>
    `;

    this._injectStyles();
    this._attachEventListeners();
    document.body.appendChild(this.container);

    // 左下のMキーヒントを追加
    this.createMKeyHint();

    // 下部中央のヒントメッセージを追加
    this.createHintMessage();
  }

  createMKeyHint() {
    this.mKeyHint = document.createElement('div');
    this.mKeyHint.className = 'm-key-hint';
    this.mKeyHint.innerHTML = `
      <kbd>M</kbd>
      <span>Toggle Menu</span>
    `;
    document.body.appendChild(this.mKeyHint);
  }

  createHintMessage() {
    this.hintMessage = document.createElement('div');
    this.hintMessage.className = 'hint-message';
    this.hintMessage.id = 'hint-message';
    this.hintMessage.innerHTML = `
      <span class="hint-inactive">Click to start exploring</span>
      <span class="hint-active">Click again or press ESC to exit</span>
    `;
    document.body.appendChild(this.hintMessage);
  }

  _injectStyles() {
    if (document.getElementById('unified-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'unified-ui-styles';
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      #unified-ui {
        position: fixed;
        top: 24px;
        left: 24px;
        width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        color: #ffffff;
        user-select: none;
        z-index: 1000;
      }

      /* ハンバーガーメニュー */
      .hamburger-menu {
        position: absolute;
        top: 0;
        left: 0;
        width: 60px;
        height: 60px;
        background: rgba(15, 15, 25, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        pointer-events: none;
        transform: translateX(-10px);
      }

      #unified-ui.closed .hamburger-menu {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(0);
      }

      .hamburger-menu:hover {
        background: rgba(15, 15, 25, 0.95);
        border-color: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }

      .hamburger-icon {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 20px;
      }

      .hamburger-icon span {
        display: block;
        width: 100%;
        height: 2px;
        background: #ffffff;
        border-radius: 2px;
        transition: all 0.3s ease;
      }

      .hamburger-menu:hover .hamburger-icon span {
        background: #667eea;
      }

      .hamburger-hint {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.5);
        margin-top: 2px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      /* サイドバーコンテンツ */
      .sidebar-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 1;
        transform: translateX(0);
      }

      #unified-ui.closed .sidebar-content {
        opacity: 0;
        transform: translateX(-20px);
        pointer-events: none;
      }

      /* グラスモーフィズム効果 */
      .ui-header,
      .flight-mode-section,
      .control-mode-section,
      .environment-section {
        background: rgba(15, 15, 25, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .ui-header:hover,
      .flight-mode-section:hover,
      .control-mode-section:hover,
      .environment-section:hover {
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      }

      /* ヘッダー */
      .ui-header {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 12px 16px;
      }

      .app-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .title-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.05);
      }

      .icon-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .title-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .title-text {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.5px;
        background: linear-gradient(135deg, #ffffff 0%, #b8c5e8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .title-subtitle {
        font-size: 10px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 0.3px;
      }

      /* Flight Modeセクション */
      .flight-mode-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .flight-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        color: rgba(255, 255, 255, 0.7);
        position: relative;
      }

      .flight-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .flight-btn.active {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
        border-color: rgba(16, 185, 129, 0.6);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
      }

      .flight-icon {
        font-size: 24px;
        filter: grayscale(0.5);
        transition: filter 0.3s ease;
        flex-shrink: 0;
      }

      .flight-btn.active .flight-icon {
        filter: grayscale(0);
      }

      .flight-info {
        flex: 1;
        text-align: left;
      }

      .flight-name {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
        margin-bottom: 2px;
      }

      .flight-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }

      .flight-check {
        font-size: 18px;
        color: #10b981;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .flight-btn.active .flight-check {
        opacity: 1;
      }

      .flight-hint {
        margin-top: 8px;
        text-align: center;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
      }

      .flight-hint kbd {
        margin: 0 4px;
      }

      /* Control Modeセクション */
      .control-mode-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .control-mode-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        color: rgba(255, 255, 255, 0.7);
        position: relative;
      }

      .control-mode-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .control-mode-btn.active {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
        border-color: rgba(102, 126, 234, 0.6);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
      }

      .control-icon {
        font-size: 24px;
        filter: grayscale(0.5);
        transition: filter 0.3s ease;
        flex-shrink: 0;
      }

      .control-mode-btn.active .control-icon {
        filter: grayscale(0);
      }

      .control-info {
        flex: 1;
        text-align: left;
      }

      .control-mode-name {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
        margin-bottom: 2px;
      }

      .control-mode-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }

      .control-check {
        font-size: 18px;
        color: #667eea;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .control-mode-btn.active .control-check {
        opacity: 1;
      }

      /* セクションヘッダー */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .section-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 10px;
      }

      .section-hint {
        font-size: 9px;
        color: rgba(255, 255, 255, 0.4);
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .section-hint kbd {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: inherit;
        font-size: 9px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
      }

      /* 環境リスト */
      .environment-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 180px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 4px;
        margin-right: -4px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
      }

      .environment-list::-webkit-scrollbar {
        width: 4px;
      }

      .environment-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 2px;
      }

      .environment-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }

      .environment-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .env-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        color: rgba(255, 255, 255, 0.7);
        width: 100%;
        position: relative;
      }

      .env-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .env-btn.active {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3));
        border-color: rgba(102, 126, 234, 0.6);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
      }

      .env-icon {
        font-size: 20px;
        filter: grayscale(0.5);
        transition: filter 0.3s ease;
        flex-shrink: 0;
      }

      .env-btn.active .env-icon {
        filter: grayscale(0);
      }

      .env-name {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
        flex: 1;
        text-align: left;
      }

      .env-check {
        font-size: 16px;
        color: #667eea;
        opacity: 0;
        transition: opacity 0.3s ease;
        flex-shrink: 0;
      }

      .env-btn.active .env-check {
        opacity: 1;
      }

      /* コントロールグリッド */
      .control-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .control-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 10px;
        transition: all 0.3s ease;
      }

      .control-item.disabled {
        opacity: 0.3;
      }

      .control-keys-row {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      kbd {
        min-width: 28px;
        height: 28px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-bottom-width: 2px;
        border-radius: 6px;
        font-family: inherit;
        font-size: 11px;
        font-weight: 600;
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      kbd.key-wide {
        min-width: 50px;
      }

      .icon-mouse {
        font-size: 20px;
      }

      .control-desc {
        font-size: 11px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.6);
        text-align: center;
      }

      /* ヒントメッセージ */
      .hint-message {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        padding: 12px 24px;
        background: rgba(15, 15, 25, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 12px;
        color: #fbbf24;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }

      .hint-inactive {
        display: inline-block;
        animation: hint-pulse 2s ease-in-out infinite;
      }

      .hint-active {
        display: none;
      }

      @keyframes hint-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      /* ポインターロック中は表示を切り替え */
      body.pointer-locked .hint-message {
        background: rgba(15, 15, 25, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        border-color: rgba(139, 92, 246, 0.5);
        color: #c4b5fd;
      }

      body.pointer-locked .hint-inactive {
        display: none;
      }

      body.pointer-locked .hint-active {
        display: inline-block;
      }

      /* 左下のMキーヒント */
      .m-key-hint {
        position: fixed;
        bottom: 24px;
        left: 24px;
        padding: 10px 16px;
        background: rgba(15, 15, 25, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        z-index: 1000;
        transition: all 0.3s ease;
      }

      .m-key-hint:hover {
        border-color: rgba(255, 255, 255, 0.3);
      }

      .m-key-hint kbd {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-bottom-width: 2px;
        border-radius: 6px;
        padding: 4px 8px;
        font-family: inherit;
        font-size: 11px;
        font-weight: 600;
        color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      /* レスポンシブ */
      @media (max-width: 768px) {
        #unified-ui {
          width: calc(100vw - 48px);
          max-width: 320px;
        }
      }
    `;
    document.head.appendChild(style);

    // ポインターロック状態を監視
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) {
        document.body.classList.add('pointer-locked');
      } else {
        document.body.classList.remove('pointer-locked');
      }
    });
  }

  _attachEventListeners() {
    // 環境ボタンのクリックイベント
    const envButtons = this.container.querySelectorAll('.env-btn');
    envButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const env = btn.dataset.env;
        this.setEnvironment(env);
        if (this.onEnvironmentChange) {
          this.onEnvironmentChange(env);
        }
      });
    });

    // Flight Modeボタンのクリックイベント
    const flightButtons = this.container.querySelectorAll('.flight-btn');
    flightButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        const grounded = mode === 'grounded';
        this.setMode(grounded);
        if (this.onFlightModeChange) {
          this.onFlightModeChange(grounded);
        }
      });
    });

    // Control Modeボタンのクリックイベント
    const controlModeButtons = this.container.querySelectorAll('.control-mode-btn');
    controlModeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const controlMode = btn.dataset.control;
        this.setControlMode(controlMode);
        if (this.onControlModeChange) {
          this.onControlModeChange(controlMode);
        }
      });
    });

    // ハンバーガーメニューのクリックイベント
    const hamburger = this.container.querySelector('#hamburger-menu');
    if (hamburger) {
      hamburger.addEventListener('click', () => {
        this.toggle();
      });
    }
  }

  _attachKeyboardListener() {
    document.addEventListener('keydown', (event) => {
      // Mキーでメニュートグル
      if (event.code === 'KeyM') {
        this.toggle();
      }

      // Eキーで環境切り替え
      if (event.code === 'KeyE') {
        this.cycleEnvironment();
      }
    });
  }

  cycleEnvironment() {
    // EnvironmentManagerから現在の環境を取得（SSOT）
    const currentEnvironment = this.environmentManager ? this.environmentManager.getCurrentEnvironment() : this.environments[0];

    // 現在の環境のインデックスを取得
    const currentIndex = this.environments.indexOf(currentEnvironment);
    // 次の環境に切り替え（循環）
    const nextIndex = (currentIndex + 1) % this.environments.length;
    const nextEnv = this.environments[nextIndex];

    this.setEnvironment(nextEnv);
    if (this.onEnvironmentChange) {
      this.onEnvironmentChange(nextEnv);
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.container.classList.remove('closed');
      if (this.mKeyHint) this.mKeyHint.style.display = 'flex';
    } else {
      this.container.classList.add('closed');
      if (this.mKeyHint) this.mKeyHint.style.display = 'none';
    }
  }

  open() {
    this.isOpen = true;
    this.container.classList.remove('closed');
    if (this.mKeyHint) this.mKeyHint.style.display = 'flex';
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('closed');
    if (this.mKeyHint) this.mKeyHint.style.display = 'none';
  }

  setMode(grounded) {
    this.currentMode = grounded ? 'grounded' : 'free';

    // Flight Modeボタンの状態を更新
    const flightButtons = this.container.querySelectorAll('.flight-btn');
    flightButtons.forEach(btn => {
      const mode = btn.dataset.mode;
      if ((mode === 'grounded' && grounded) || (mode === 'free' && !grounded)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 上下移動コントロールの表示を更新
    const verticalControl = document.getElementById('vertical-control');
    if (verticalControl) {
      if (grounded) {
        verticalControl.classList.add('disabled');
      } else {
        verticalControl.classList.remove('disabled');
      }
    }
  }

  setEnvironment(env) {
    // EnvironmentManagerがSSOTなので、ここでは状態を保存しない
    // UIの見た目だけを更新
    const envButtons = this.container.querySelectorAll('.env-btn');
    envButtons.forEach(btn => {
      if (btn.dataset.env === env) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setControlMode(controlMode) {
    this.currentControlMode = controlMode;

    // Control Modeボタンの状態を更新
    const controlModeButtons = this.container.querySelectorAll('.control-mode-btn');
    controlModeButtons.forEach(btn => {
      if (btn.dataset.control === controlMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.mKeyHint && this.mKeyHint.parentNode) {
      this.mKeyHint.parentNode.removeChild(this.mKeyHint);
    }
    if (this.hintMessage && this.hintMessage.parentNode) {
      this.hintMessage.parentNode.removeChild(this.hintMessage);
    }
  }
}
