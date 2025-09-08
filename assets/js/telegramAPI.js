/**
 * TelegramAPI - Модуль для работы с Telegram Mini App API
 * Отвечает за интеграцию с Telegram и управление интерфейсом Mini App
 */

class TelegramAPI {
  constructor() {
    this.tg = window.Telegram?.WebApp;
    this.isInitialized = false;
  }
  
  async init() {
    if (!this.tg) {
      console.warn('Telegram WebApp API not available. Running in standalone mode.');
      return this.initStandaloneMode();
    }
    
    try {
      // Инициализация Telegram Mini App
      this.tg.ready();
      this.tg.expand();
      
      // Настройка темы
      this.setupTheme();
      
      // Настройка главной кнопки
      this.setupMainButton();
      
      // Настройка кнопки назад
      this.setupBackButton();
      
      // Обработчики событий
      this.bindTelegramEvents();
      
      this.isInitialized = true;
      console.log('Telegram Mini App initialized');
      
    } catch (error) {
      console.error('Failed to initialize Telegram Mini App:', error);
      return this.initStandaloneMode();
    }
  }
  
  initStandaloneMode() {
    console.log('Running in standalone mode');
    // Применяем стандартную тему для веб-версии
    document.documentElement.style.setProperty('--tg-theme-bg-color', '#0f1115');
    document.documentElement.style.setProperty('--tg-theme-text-color', '#e7e9ee');
    return Promise.resolve();
  }
  
  setupTheme() {
    if (!this.tg) return;
    
    // Применяем цвета темы Telegram
    const themeParams = this.tg.themeParams;
    
    if (themeParams.bg_color) {
      document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
    }
    
    if (themeParams.text_color) {
      document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color);
    }
    
    if (themeParams.button_color) {
      document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color);
    }
    
    if (themeParams.button_text_color) {
      document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
    }
    
    // Устанавливаем цвет заголовка
    this.tg.setHeaderColor('#151924');
  }
  
  setupMainButton() {
    if (!this.tg) return;
    
    // Настройка главной кнопки
    this.tg.MainButton.text = 'Поделиться результатом';
    this.tg.MainButton.color = '#2ea6ff';
    this.tg.MainButton.textColor = '#ffffff';
    
    // Обработчик нажатия главной кнопки
    this.tg.MainButton.onClick(() => {
      this.shareResult();
    });
  }
  
  setupBackButton() {
    if (!this.tg) return;
    
    // Обработчик кнопки назад
    this.tg.BackButton.onClick(() => {
      this.handleBackButton();
    });
  }
  
  bindTelegramEvents() {
    if (!this.tg) return;
    
    // Обработчик изменения видимости
    this.tg.onEvent('viewportChanged', () => {
      console.log('Viewport changed:', this.tg.viewportHeight);
    });
    
    // Обработчик изменения темы
    this.tg.onEvent('themeChanged', () => {
      console.log('Theme changed');
      this.setupTheme();
    });
    
    // Обработчик закрытия приложения
    this.tg.onEvent('mainButtonClicked', () => {
      this.shareResult();
    });
  }
  
  showMainButton() {
    if (this.tg) {
      this.tg.MainButton.show();
    }
  }
  
  hideMainButton() {
    if (this.tg) {
      this.tg.MainButton.hide();
    }
  }
  
  showBackButton() {
    if (this.tg) {
      this.tg.BackButton.show();
    }
  }
  
  hideBackButton() {
    if (this.tg) {
      this.tg.BackButton.hide();
    }
  }
  
  setMainButtonText(text) {
    if (this.tg) {
      this.tg.MainButton.text = text;
    }
  }
  
  enableMainButton() {
    if (this.tg) {
      this.tg.MainButton.enable();
    }
  }
  
  disableMainButton() {
    if (this.tg) {
      this.tg.MainButton.disable();
    }
  }
  
  shareResult() {
    if (!this.tg) {
      // В standalone режиме показываем альтернативу
      this.showStandaloneShare();
      return;
    }
    
    // Получаем данные для отправки
    const resultData = this.prepareResultData();
    
    // Отправляем данные в Telegram
    this.tg.sendData(JSON.stringify(resultData));
  }
  
  prepareResultData() {
    const app = window.stringArtApp;
    if (!app) return {};
    
    return {
      type: 'stringart_result',
      palette: app.state.currentPalette,
      actualPalette: app.state.actualPalette,
      colorMapping: app.state.colorMapping,
      settings: {
        backgroundColor: app.state.backgroundColor,
        imageProcessed: !!app.state.originalImage
      },
      timestamp: Date.now()
    };
  }
  
  showStandaloneShare() {
    // Создаем модальное окно для standalone режима
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: var(--card);
      padding: 20px;
      border-radius: 12px;
      max-width: 400px;
      text-align: center;
      color: var(--text);
    `;
    
    content.innerHTML = `
      <h3>Результат готов!</h3>
      <p>В Telegram Mini App вы могли бы поделиться результатом с друзьями.</p>
      <button onclick="this.parentElement.parentElement.remove()" 
              style="background: var(--accent); color: white; border: none; 
                     padding: 10px 20px; border-radius: 8px; cursor: pointer;">
        Закрыть
      </button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Автоматическое закрытие через 5 секунд
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 5000);
  }
  
  handleBackButton() {
    // Логика обработки кнопки назад
    const app = window.stringArtApp;
    if (app) {
      // Можно реализовать навигацию между этапами
      console.log('Back button pressed');
    }
  }
  
  showAlert(message) {
    if (this.tg) {
      this.tg.showAlert(message);
    } else {
      alert(message);
    }
  }
  
  showConfirm(message, callback) {
    if (this.tg) {
      this.tg.showConfirm(message, callback);
    } else {
      const result = confirm(message);
      callback(result);
    }
  }
  
  showPopup(params) {
    if (this.tg) {
      this.tg.showPopup(params);
    } else {
      // Fallback для standalone режима
      alert(params.message || 'Popup');
    }
  }
  
  hapticFeedback(type = 'light') {
    if (this.tg && this.tg.HapticFeedback) {
      switch (type) {
        case 'light':
          this.tg.HapticFeedback.impactOccurred('light');
          break;
        case 'medium':
          this.tg.HapticFeedback.impactOccurred('medium');
          break;
        case 'heavy':
          this.tg.HapticFeedback.impactOccurred('heavy');
          break;
        case 'success':
          this.tg.HapticFeedback.notificationOccurred('success');
          break;
        case 'error':
          this.tg.HapticFeedback.notificationOccurred('error');
          break;
      }
    }
  }
  
  // Геттеры для получения информации о пользователе и окружении
  get user() {
    return this.tg?.initDataUnsafe?.user || null;
  }
  
  get platform() {
    return this.tg?.platform || 'unknown';
  }
  
  get version() {
    return this.tg?.version || '6.0';
  }
  
  get colorScheme() {
    return this.tg?.colorScheme || 'dark';
  }
  
  get isExpanded() {
    return this.tg?.isExpanded || false;
  }
  
  get viewportHeight() {
    return this.tg?.viewportHeight || window.innerHeight;
  }
  
  get viewportStableHeight() {
    return this.tg?.viewportStableHeight || window.innerHeight;
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TelegramAPI;
}
