/**
 * StringArt Telegram Mini App - Main Application
 * Главный файл приложения, координирующий работу всех модулей
 */

class StringArtApp {
  constructor() {
    this.imageProcessor = null;
    this.colorAnalyzer = null;
    this.stringartPreview = null;
    this.telegramAPI = null;
    
    // DOM утилиты (перенесены из utils.js)
    this.domUtils = {
      // Ограничение значения в диапазоне
      clamp: (value, min, max) => {
        return Math.min(Math.max(value, min), max);
      },
      
      // Линейная интерполяция
      lerp: (start, end, factor) => {
        return start + (end - start) * factor;
      },
      
      // Преобразование градусов в радианы
      degToRad: (degrees) => {
        return degrees * (Math.PI / 180);
      },
      
      // Преобразование радианов в градусы
      radToDeg: (radians) => {
        return radians * (180 / Math.PI);
      },
      
      // Получение расстояния между двумя точками
      distance: (x1, y1, x2, y2) => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      },
      
      // Создание элемента с классами и атрибутами
      createElement: (tag, className = '', attributes = {}) => {
        const element = document.createElement(tag);
        
        if (className) {
          element.className = className;
        }
        
        Object.entries(attributes).forEach(([key, value]) => {
          element.setAttribute(key, value);
        });
        
        return element;
      },
      
      // Форматирование числа с определенным количеством знаков после запятой
      formatNumber: (number, decimals = 2) => {
        return Number(number).toFixed(decimals);
      },
      
      // Проверка поддержки браузером определенной возможности
      isSupported: (feature) => {
        switch (feature) {
          case 'webgl':
            return !!document.createElement('canvas').getContext('webgl');
          case 'camera':
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
          case 'file':
            return !!(window.File && window.FileReader && window.FileList && window.Blob);
          case 'canvas':
            return !!document.createElement('canvas').getContext('2d');
          default:
            return false;
        }
      },
      
      // Дебаунс функции
      debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      },
      
      // Троттлинг функции
      throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
          if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      },
      
      // Генерация уникального ID
      generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
      },
      
      // Проверка мобильного устройства
      isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      },
      
      // Копирование текста в буфер обмена
      copyToClipboard: async (text) => {
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(text);
            return true;
          } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
          }
        } else {
          // Fallback для старых браузеров
          const textArea = document.createElement('textarea');
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
          } catch (err) {
            console.error('Fallback copy failed: ', err);
            document.body.removeChild(textArea);
            return false;
          }
        }
      },
      
      // Форматирование размера файла
      formatFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
    };
    
    // Состояние приложения (инициализируется после загрузки параметров)
    this.state = {
      originalImage: null,
      originalWidth: 0,
      originalHeight: 0,
      currentPalette: [],
      actualPalette: [],
      colorMapping: [],
      backgroundColor: '#ffffff' // Будет обновлено из параметров
    };
    
    this.init();
  }
  
  initializeParameters() {
    // Инициализация параметров приложения
    if (!window.appParameters) {
      console.error('Parameters not loaded! Make sure parameters.js is included before app.js');
      return;
    }
    
    // Логирование параметров в режиме отладки
    if (window.appParameters.debug.enabled) {
      console.log('Application parameters loaded:', window.appParameters);
    }
    
    // Инициализация состояния приложения из параметров
    this.state.backgroundColor = window.appParameters.background.defaultColor;
  }
  
  async init() {
    try {
      // Инициализация параметров приложения
      this.initializeParameters();
      
      // Инициализация Telegram Mini App API
      this.telegramAPI = new TelegramAPI();
      await this.telegramAPI.init();
      
      // Инициализация модулей
      this.imageProcessor = new ImageProcessor(this);
      this.mapGenerator = new MapGenerator(this);
      this.colorAnalyzer = new ColorAnalyzer(this);
      this.actualColors = new ActualColors(this);
      this.stringartPreview = new StringArtPreview(this);
      this.backgroundDetector = new BackgroundDetector(this);
      
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
      backgroundColor: window.appParameters.background.defaultColor
    };
    
    // Сброс UI
    this.imageProcessor.reset();
    this.colorAnalyzer.reset();
    this.actualColors.reset();
    this.stringartPreview.reset();
    this.backgroundDetector.reset();
    
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
    this.stringartPreview?.onStateChange?.(this.state);
    this.backgroundDetector?.onStateChange?.(this.state);
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
