/**
 * StringArt Telegram Mini App - Main Application
 * Главный файл приложения, координирующий работу всех модулей
 */

class StringArtApp {
  constructor() {
    this.imageProcessor = null;
    this.colorAnalyzer = null;
    this.stringartGenerator = null;
    this.telegramAPI = null;
    
    // Состояние приложения
    this.state = {
      originalImage: null,
      originalWidth: 0,
      originalHeight: 0,
      currentPalette: [],
      actualPalette: [],
      colorMapping: [],
      backgroundColor: '#ffffff'
    };
    
    this.init();
  }
  
  async init() {
    try {
      // Инициализация Telegram Mini App API
      this.telegramAPI = new TelegramAPI();
      await this.telegramAPI.init();
      
      // Инициализация модулей
      this.imageProcessor = new ImageProcessor(this);
      this.colorAnalyzer = new ColorAnalyzer(this);
      this.actualColors = new ActualColors(this);
      this.stringartGenerator = new StringArtGenerator(this);
      
      // Инициализация UI
      this.initializeUI();
      
      // Инициализация интерфейса метода кластеризации
      this.colorAnalyzer.updateMethodInterface();
      
      // НЕ загружаем тестовое изображение автоматически - пользователь сам выберет
      // this.loadDefaultImage();
      
      // Принудительное обновление фактической палитры для мобильных при инициализации
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      window.Telegram?.WebApp?.platform ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
      
      if (isMobile && this.actualColors) {
        setTimeout(() => {
          this.actualColors.renderActualPalette();
        }, 500);
        
        setTimeout(() => {
          this.actualColors.renderActualPalette();
        }, 1500);
      }
      
      console.log('StringArt App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
  
  initializeUI() {
    // Получение элементов DOM
    this.elements = {
      addMediaBtn: document.getElementById('addMediaBtn'),
      testImageBtn: document.getElementById('testImageBtn'),
      resetBtn: document.getElementById('resetBtn'),
      previewImg: document.getElementById('previewImg'),
      secondImg: document.getElementById('secondImg'),
      // ... остальные элементы
    };
    
    // Привязка обработчиков событий
    this.bindEvents();
  }
  
  bindEvents() {
    // Обработчик для объединенной кнопки добавления
    this.elements.addMediaBtn?.addEventListener('click', () => {
      const modal = document.getElementById('addMediaModal');
      const fromCam = document.getElementById('addMediaFromCamera');
      const fromFile = document.getElementById('addMediaFromFile');
      const cancel = document.getElementById('addMediaCancel');
      if (!modal || !fromCam || !fromFile || !cancel) {
        // Fallback: открыть файловый диалог
        this.imageProcessor.openFileDialog();
        return;
      }
      modal.style.display = 'block';
      const close = () => { modal.style.display = 'none'; cleanup(); };
      const onCam = () => { close(); this.imageProcessor.openCamera(); };
      const onFile = () => { close(); this.imageProcessor.openFileDialog(); };
      const onCancel = () => { close(); };
      function cleanup() {
        fromCam.removeEventListener('click', onCam);
        fromFile.removeEventListener('click', onFile);
        cancel.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
      }
      function onBackdrop(e) {
        if (e.target === modal) close();
      }
      fromCam.addEventListener('click', onCam);
      fromFile.addEventListener('click', onFile);
      cancel.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
    });
    
    this.elements.testImageBtn?.addEventListener('click', () => {
      this.loadDefaultImage();
    });
    
    this.elements.resetBtn?.addEventListener('click', () => {
      this.resetApp();
    });
    
    // Обработчики для настроек изображения
    const resolutionRange = document.getElementById('resolutionRange');
    const resolutionInput = document.getElementById('resolutionInput');
    
    resolutionRange?.addEventListener('input', () => {
      this.imageProcessor.updateResolution(resolutionRange.value);
    });
    
    resolutionInput?.addEventListener('input', () => {
      this.imageProcessor.updateResolution(resolutionInput.value);
    });
  }
  
  loadDefaultImage() {
    // Загружаем тестовое изображение
    this.imageProcessor.loadImage();
  }
  
  resetApp() {
    // Сброс состояния приложения
    this.state = {
      originalImage: null,
      originalWidth: 0,
      originalHeight: 0,
      currentPalette: [],
      actualPalette: [],
      colorMapping: [],
      backgroundColor: '#ffffff'
    };
    
    // Сброс UI
    this.imageProcessor.reset();
    this.colorAnalyzer.reset();
    this.actualColors.reset();
    this.stringartGenerator.reset();
    
    // НЕ загружаем тестовое изображение автоматически - пользователь сам выберет
    // this.loadDefaultImage();
  }
  
  // Методы для обновления состояния
  updateState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyStateChange();
  }
  
  notifyStateChange() {
    // Уведомляем модули об изменении состояния
    this.imageProcessor?.onStateChange?.(this.state);
    this.colorAnalyzer?.onStateChange?.(this.state);
    this.actualColors?.onStateChange?.(this.state);
    this.stringartGenerator?.onStateChange?.(this.state);
  }
  
  // Публичные методы для взаимодействия с модулями
  setOriginalImage(imageData, width, height) {
    this.updateState({
      originalImage: imageData,
      originalWidth: width,
      originalHeight: height
    });
  }
  
  setPalette(palette) {
    this.updateState({
      currentPalette: palette
    });
  }
  
  setActualPalette(palette) {
    this.updateState({
      actualPalette: palette
    });
  }
  
  setColorMapping(mapping) {
    this.updateState({
      colorMapping: mapping
    });
  }
  
  setBackgroundColor(color) {
    this.updateState({
      backgroundColor: color
    });
  }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  window.stringArtApp = new StringArtApp();
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StringArtApp;
}
