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
      this.stringartGenerator = new StringArtGenerator(this);
      
      // Инициализация UI
      this.initializeUI();
      
      // Загрузка тестового изображения
      this.loadDefaultImage();
      
      console.log('StringArt App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
  
  initializeUI() {
    // Получение элементов DOM
    this.elements = {
      uploadBtn: document.getElementById('uploadBtn'),
      cameraBtn: document.getElementById('cameraBtn'),
      resetBtn: document.getElementById('resetBtn'),
      previewImg: document.getElementById('previewImg'),
      secondImg: document.getElementById('secondImg'),
      // ... остальные элементы
    };
    
    // Привязка обработчиков событий
    this.bindEvents();
  }
  
  bindEvents() {
    // Обработчики для загрузки файлов
    this.elements.uploadBtn?.addEventListener('click', () => {
      this.imageProcessor.openFileDialog();
    });
    
    this.elements.cameraBtn?.addEventListener('click', () => {
      this.imageProcessor.openCamera();
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
    const defaultImgUrl = 'assets/images/i.webp';
    this.imageProcessor.loadImage(defaultImgUrl);
  }
  
  resetApp() {
    // Сброс состояния приложения
    this.state = {
      originalImage: null,
      originalWidth: 0,
      currentPalette: [],
      actualPalette: [],
      colorMapping: [],
      backgroundColor: '#ffffff'
    };
    
    // Сброс UI
    this.imageProcessor.reset();
    this.colorAnalyzer.reset();
    this.stringartGenerator.reset();
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
    this.stringartGenerator?.onStateChange?.(this.state);
  }
  
  // Публичные методы для взаимодействия с модулями
  setOriginalImage(imageData, width) {
    this.updateState({
      originalImage: imageData,
      originalWidth: width
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
