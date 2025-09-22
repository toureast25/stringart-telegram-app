/**
 * MapGenerator - Централизованный модуль для генерации карт цветов
 * Унифицированная логика создания масок изображений для любых наборов цветов
 */

class MapGenerator {
  constructor(app) {
    this.app = app;
  }

  /**
   * Генерирует карты цветов для заданной палитры
   * @param {Array} palette - Массив цветов в формате HEX
   * @param {string} containerId - ID контейнера для отображения карт
   * @param {Object} options - Дополнительные опции
   * @param {Array} colorMapping - Маппинг цветов (опционально)
   * @param {Function} onProgress - Callback для отслеживания прогресса
   */
  generateColorMaps(palette, containerId, options = {}, colorMapping = null, onProgress = null) {
    const {
      showLabels = true,
      labelPrefix = 'ЦВЕТ',
      borderWidth = '4px',
      showLoading = true
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    const secondImg = document.getElementById('secondImg');
    if (!secondImg.src || palette.length === 0) {
      if (showLoading) this.hideLoading(container);
      return;
    }


    if (showLoading) this.showLoading(container);

    // Очищаем контейнер
    container.innerHTML = '';

    const imageData = this.getImageData(secondImg);
    // Создаем RGB палитру оптимизированно
    const paletteRGB = new Array(palette.length);
    for (let i = 0; i < palette.length; i++) {
      paletteRGB[i] = this.app.colorAnalyzer.colorUtils.hexToRgb(palette[i]);
    }
    
    if (colorMapping) {
      // Генерация карт с учетом маппинга (для фактических цветов)
      this.generateMappedMaps(imageData, paletteRGB, palette, colorMapping, container, {
        showLabels,
        labelPrefix,
        borderWidth,
        onProgress
      });
    } else {
      // Обычная генерация карт (для расчётных цветов)
      this.generateStandardMaps(imageData, paletteRGB, palette, container, {
        showLabels,
        labelPrefix,
        borderWidth,
        onProgress
      });
    }
    
    if (showLoading) this.hideLoading(container);
  }

  /**
   * Генерирует стандартные карты цветов (без маппинга)
   */
  generateStandardMaps(imageData, paletteRGB, palette, container, options) {
    const { data, width, height } = imageData;
    const { showLabels, labelPrefix, borderWidth, onProgress } = options;

    // Создаем canvas'ы для каждого цвета (оптимизированно)
    const canvases = new Array(palette.length);
    for (let i = 0; i < palette.length; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvases[i] = canvas;
    }

    // Обрабатываем пиксели
    this.processStandardPixels(data, paletteRGB, canvases, onProgress);

    // Создаем DOM элементы (оптимизированно)
    for (let i = 0; i < palette.length; i++) {
      const mapContainer = this.createMapContainer(canvases[i], palette[i], {
        showLabels,
        labelPrefix,
        borderWidth,
        index: i
      });
      container.appendChild(mapContainer);
    }
  }

  /**
   * Генерирует карты цветов с учетом маппинга (для фактических цветов)
   */
  generateMappedMaps(imageData, paletteRGB, palette, colorMapping, container, options) {
    const { data, width, height } = imageData;
    const { showLabels, labelPrefix, borderWidth, onProgress } = options;

    // Получаем уникальные индексы фактических цветов (оптимизированно)
    const actualIndicesSet = new Set();
    for (let i = 0; i < colorMapping.length; i++) {
      actualIndicesSet.add(colorMapping[i].actualIndex);
    }
    const usedActualIndices = Array.from(actualIndicesSet);
    
    // Создаем canvas'ы для каждого фактического цвета (оптимизированно)
    const canvases = new Array(usedActualIndices.length);
    for (let i = 0; i < usedActualIndices.length; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvases[i] = canvas;
    }

    // Обрабатываем пиксели
    this.processMappedPixels(data, paletteRGB, canvases, colorMapping, usedActualIndices, onProgress);

    // Создаем DOM элементы (оптимизированно)
    for (let i = 0; i < usedActualIndices.length; i++) {
      const actualIndex = usedActualIndices[i];
      const actualColor = this.app.state.actualPalette[actualIndex];
      const mapContainer = this.createMapContainer(canvases[i], actualColor, {
        showLabels,
        labelPrefix: 'ФАКТИЧЕСКИЙ',
        borderWidth,
        index: actualIndex
      });
      container.appendChild(mapContainer);
    }
  }

  /**
   * Обрабатывает пиксели для стандартных карт (оптимизированная версия)
   */
  processStandardPixels(data, paletteRGB, canvases, onProgress) {
    const totalPixels = data.length / 4;
    const numCanvases = canvases.length;

    // Создаем ImageData для каждого canvas один раз с предварительным заполнением
    const imageDataArray = new Array(numCanvases);
    const mapDataArray = new Array(numCanvases);
    
    for (let i = 0; i < numCanvases; i++) {
      const ctx = canvases[i].getContext('2d');
      imageDataArray[i] = ctx.createImageData(canvases[i].width, canvases[i].height);
      const data = imageDataArray[i].data;
      
      // Предварительно заполняем белыми пикселями
      for (let j = 0; j < data.length; j += 4) {
        data[j] = 255;     // R
        data[j + 1] = 255; // G
        data[j + 2] = 255; // B
        data[j + 3] = 255; // A
      }
      
      mapDataArray[i] = data;
    }

    // Обрабатываем все пиксели
    for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex++) {
      const i = pixelIndex * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Находим ближайший цвет ОДИН РАЗ (максимально оптимизированно)
      let minDistance = Infinity;
      let minIndex = 0;
      
      // Используем for цикл для максимальной скорости
      for (let j = 0; j < paletteRGB.length; j++) {
        const c = paletteRGB[j];
        // Избегаем создания переменных dr, dg, db
        const distance = (r - c[0]) * (r - c[0]) + (g - c[1]) * (g - c[1]) + (b - c[2]) * (b - c[2]);
        if (distance < minDistance) {
          minDistance = distance;
          minIndex = j;
        }
      }
      
      // Обрабатываем все canvas'ы используя найденный индекс
      for (let canvasIndex = 0; canvasIndex < numCanvases; canvasIndex++) {
        const mapData = mapDataArray[canvasIndex];
        
        if (minIndex === canvasIndex) {
          // Только меняем на черный, белый уже установлен
          mapData[i] = 0;     // R
          mapData[i + 1] = 0; // G
          mapData[i + 2] = 0; // B
          // A остается 255
        }
      }
    }
    
    // Записываем все ImageData в canvas'ы
    for (let i = 0; i < numCanvases; i++) {
      const ctx = canvases[i].getContext('2d');
      ctx.putImageData(imageDataArray[i], 0, 0);
    }
    
    if (onProgress) {
      onProgress(1);
    }
  }

  /**
   * Обрабатывает пиксели для карт с маппингом (оптимизированная версия)
   */
  processMappedPixels(data, paletteRGB, canvases, colorMapping, usedActualIndices, onProgress) {
    const totalPixels = data.length / 4;
    const numCanvases = canvases.length;

    // Создаем Map для быстрого поиска маппинга (оптимизированно)
    const mappingMap = new Map();
    for (let i = 0; i < colorMapping.length; i++) {
      const mapping = colorMapping[i];
      const key = `${mapping.calculatedIndex}-${mapping.actualIndex}`;
      mappingMap.set(key, true);
    }

    // Создаем ImageData для каждого canvas один раз с предварительным заполнением
    const imageDataArray = new Array(numCanvases);
    const mapDataArray = new Array(numCanvases);
    
    for (let i = 0; i < numCanvases; i++) {
      const ctx = canvases[i].getContext('2d');
      imageDataArray[i] = ctx.createImageData(canvases[i].width, canvases[i].height);
      const data = imageDataArray[i].data;
      
      // Предварительно заполняем белыми пикселями
      for (let j = 0; j < data.length; j += 4) {
        data[j] = 255;     // R
        data[j + 1] = 255; // G
        data[j + 2] = 255; // B
        data[j + 3] = 255; // A
      }
      
      mapDataArray[i] = data;
    }

    // Обрабатываем все пиксели
    for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex++) {
      const i = pixelIndex * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Находим ближайший расчётный цвет ОДИН РАЗ (максимально оптимизированно)
      let minDistance = Infinity;
      let minIndex = 0;
      
      // Используем for цикл для максимальной скорости
      for (let j = 0; j < paletteRGB.length; j++) {
        const c = paletteRGB[j];
        // Избегаем создания переменных dr, dg, db
        const distance = (r - c[0]) * (r - c[0]) + (g - c[1]) * (g - c[1]) + (b - c[2]) * (b - c[2]);
        if (distance < minDistance) {
          minDistance = distance;
          minIndex = j;
        }
      }
      
      // Обрабатываем все canvas'ы используя найденный индекс
      for (let canvasIndex = 0; canvasIndex < numCanvases; canvasIndex++) {
        const mapData = mapDataArray[canvasIndex];
        const actualIndex = usedActualIndices[canvasIndex];
        
        // Быстрая проверка маппинга через Map (оптимизированно)
        const hasMapping = mappingMap.has(`${minIndex}-${actualIndex}`);
        
        if (hasMapping) {
          // Только меняем на черный, белый уже установлен
          mapData[i] = 0;     // R
          mapData[i + 1] = 0; // G
          mapData[i + 2] = 0; // B
          // A остается 255
        }
      }
    }
    
    // Записываем все ImageData в canvas'ы
    for (let i = 0; i < numCanvases; i++) {
      const ctx = canvases[i].getContext('2d');
      ctx.putImageData(imageDataArray[i], 0, 0);
    }
    
    if (onProgress) {
      onProgress(1);
    }
  }

  /**
   * Создает контейнер для карты с изображением и меткой
   */
  createMapContainer(mapCanvas, color, options) {
    const { showLabels, labelPrefix, borderWidth, index } = options;
    
    const mapContainer = document.createElement('div');
    mapContainer.className = 'map-container';
    
    const img = document.createElement('img');
    img.src = mapCanvas.toDataURL();
    img.style.border = `${borderWidth} solid ${color}`;
    
    mapContainer.appendChild(img);
    
    if (showLabels) {
      const label = document.createElement('div');
      label.className = 'map-label';
      
      if (index === 0 && labelPrefix === 'ЦВЕТ') {
        label.textContent = 'ФОН';
        label.style.backgroundColor = 'rgba(46,166,255,0.9)';
      } else {
        label.textContent = `${labelPrefix} ${index + 1}`;
      }
      
      mapContainer.appendChild(label);
    }
    
    return mapContainer;
  }

  /**
   * Получает данные изображения
   */
  getImageData(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    return {
      data: imageData.data,
      width: canvas.width,
      height: canvas.height
    };
  }


  /**
   * Показывает индикатор загрузки
   */
  showLoading(container) {
    const loading = document.createElement('div');
    loading.className = 'loading-indicator';
    loading.innerHTML = '<div class="spinner"></div><span>Генерация карт...</span>';
    container.appendChild(loading);
  }

  /**
   * Скрывает индикатор загрузки
   */
  hideLoading(container) {
    const loading = container.querySelector('.loading-indicator');
    if (loading) {
      loading.remove();
    }
  }


  /**
   * Получает статистику использования цветов
   */
  getColorUsageStats(colorMapping) {
    if (!colorMapping || colorMapping.length === 0) {
      return { used: 0, total: 0 };
    }
    
    const usedActualIndices = [...new Set(colorMapping.map(m => m.actualIndex))];
    return {
      used: usedActualIndices.length,
      total: this.app.state.actualPalette.length
    };
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapGenerator;
}
