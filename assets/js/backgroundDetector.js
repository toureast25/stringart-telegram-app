/**
 * BackgroundDetector - Модуль для автоматического определения цвета фона
 * Отвечает за анализ краев изображения и определение доминирующего цвета фона
 */

class BackgroundDetector {
  constructor(app) {
    this.app = app;
    this.elements = this.getElements();
    this.debounceTimeout = null;
    this.bindEvents();
  }
  
  getElements() {
    return {
      bgEdgePercent: document.getElementById('bgEdgePercent'),
      autoDetectBgBtn: document.getElementById('autoDetectBgBtn'),
      bgColorDisplay: document.getElementById('bgColorDisplay'),
      currentBgColor: document.getElementById('currentBgColor'),
      bgColorPicker: document.getElementById('bgColorPicker')
    };
  }
  
  bindEvents() {
    // Обработчики событий
    this.elements.autoDetectBgBtn?.addEventListener('click', () => this.autoDetectBackground());
    this.elements.bgEdgePercent?.addEventListener('input', () => this.debouncedRecalc());
    this.elements.bgEdgePercent?.addEventListener('change', () => this.recalculateBackgroundColor());
    this.elements.bgColorDisplay?.addEventListener('click', () => this.openColorEditor());
    
    // Предустановленные цвета
    document.querySelectorAll('.bg-color-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-bg');
        if (color) this.setBackgroundColor(color);
      });
    });
  }
  
  debouncedRecalc() {
    clearTimeout(this.debounceTimeout);
    const delay = window.appParameters?.performance?.delays?.backgroundRecalc || 24;
    this.debounceTimeout = setTimeout(() => this.recalculateBackgroundColor(), delay);
  }
  
  openColorEditor() {
    const current = this.app.state.backgroundColor || 'transparent';
    // Если текущий цвет прозрачный, показываем белый в редакторе
    const editorColor = current === 'transparent' ? '#ffffff' : current;
    
    this.app.colorAnalyzer?.openColorEditor(editorColor, (selected) => {
      if (selected) this.setBackgroundColor(selected);
    });
  }
  
  /**
   * Автоматическое определение цвета фона по краям изображения
   */
  autoDetectBackground() {
    const previewImg = document.getElementById('previewImg');
    
    if (!previewImg || !previewImg.src) {
      this.showAlert('Сначала загрузите изображение для автоматического определения цвета фона');
      return;
    }
    
    if (previewImg.complete && previewImg.naturalWidth > 0) {
      // Изображение уже загружено - сразу анализируем
      this.recalculateBackgroundColor();
    } else {
      // Изображение еще загружается - ждем события load
      previewImg.onload = () => this.recalculateBackgroundColor();
    }
  }
  
  showAlert(message) {
    this.app.telegramAPI?.showAlert(message) || alert(message);
  }
  
  /**
   * Пересчет цвета фона на основе текущих настроек
   */
  recalculateBackgroundColor() {
    const previewImg = document.getElementById('previewImg');
    if (!previewImg || !previewImg.src || !previewImg.complete || !previewImg.naturalWidth) {
      return;
    }
    
    const params = window.appParameters;
    const percent = parseInt(this.elements.bgEdgePercent.value) || params.background.autoDetection.edgePercent.default;
    const bgColor = this.app.imageProcessor.imageUtils.getAverageEdgeColor(previewImg, percent);
    this.setBackgroundColor(bgColor);
  }
  
  /**
   * Установка цвета фона и обновление всех связанных элементов
   */
  setBackgroundColor(color) {
    this.app.setBackgroundColor(color);
    this.updateUI(color);
    this.updatePaletteAndMaps(color);
  }
  
  updateUI(color) {
    if (this.elements.bgColorDisplay) {
      if (color === 'transparent') {
        this.elements.bgColorDisplay.style.background = 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)';
        this.elements.bgColorDisplay.style.backgroundSize = '20px 20px';
        this.elements.bgColorDisplay.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
      } else {
        this.elements.bgColorDisplay.style.background = color;
        this.elements.bgColorDisplay.style.backgroundSize = '';
        this.elements.bgColorDisplay.style.backgroundPosition = '';
      }
    }
    
    if (this.elements.bgColorPicker) {
      this.elements.bgColorPicker.value = color === 'transparent' ? '#ffffff' : color;
    }
    
    if (this.elements.currentBgColor) {
      this.elements.currentBgColor.textContent = color === 'transparent' ? 'Прозрачный' : color;
    }
  }
  
  updatePaletteAndMaps(color) {
    if (this.app.state.currentPalette.length === 0) return;
    
    // Обновляем палитру
    const newPalette = [...this.app.state.currentPalette];
    newPalette[0] = color;
    this.app.setPalette(newPalette);
    
    // Пересчитываем карты и синхронизируем
    this.app.colorAnalyzer?.generateColorMaps();
    this.syncWithActualPalette();
  }
  
  syncWithActualPalette() {
    const syncEl = document.getElementById('syncWithCalculated');
    if (this.app.actualColors && syncEl?.checked) {
      this.app.actualColors.syncActualWithCalculated();
    }
  }
  
  /**
   * Сброс настроек детектора фона
   */
  reset() {
    const params = window.appParameters;
    
    if (this.elements.bgEdgePercent) {
      this.elements.bgEdgePercent.value = params.background.autoDetection.edgePercent.default;
    }
    
    this.setBackgroundColor(params.background.defaultColor);
  }
  
  /**
   * Реакция на изменения состояния приложения
   */
  onStateChange(state) {
    if (state.backgroundColor !== this.lastBackgroundColor) {
      this.lastBackgroundColor = state.backgroundColor;
      this.updateUI(state.backgroundColor);
    }
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackgroundDetector;
}