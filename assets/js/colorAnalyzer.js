/**
 * ColorAnalyzer - Модуль для анализа цветов и кластеризации
 * Отвечает за извлечение палитры, k-means кластеризацию и работу с цветами
 */

class ColorAnalyzer {
  constructor(app) {
    this.app = app;
    
    // Цветовые утилиты (перенесены из utils.js)
    this.colorUtils = {
      // Конвертация RGB в LAB цветовое пространство
      rgbToLab: (r, g, b) => {
        function pivot(n) {
          return n > 0.008856 ? Math.pow(n, 1/3) : (7.787 * n) + (16/116);
        }
        
        r /= 255;
        g /= 255;
        b /= 255;
        
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.000;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
        
        x = pivot(x);
        y = pivot(y);
        z = pivot(z);
        
        return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
      },
      
      // Вычисление различия между цветами в LAB пространстве (Delta E)
      deltaE: (lab1, lab2) => {
        return Math.sqrt(
          (lab1[0] - lab2[0]) ** 2 + 
          (lab1[1] - lab2[1]) ** 2 + 
          (lab1[2] - lab2[2]) ** 2
        );
      },
      
      // Конвертация RGB в HEX
      rgbToHex: (r, g, b) => {
        return '#' + [r, g, b].map(x => 
          x.toString(16).padStart(2, '0')
        ).join('');
      },
      
      // Конвертация HEX в RGB
      hexToRgb: (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        return [
          (bigint >> 16) & 255,
          (bigint >> 8) & 255,
          bigint & 255
        ];
      }
    };
    
    
    // Элементы индикаторов загрузки
    this.loadingElements = {
      paletteOverlay: document.getElementById('paletteLoadingOverlay'),
      masksOverlay: document.getElementById('masksLoadingOverlay')
    };
    
    this.elements = {
      clusteringMethod: document.getElementById('clusteringMethod'),
      colorCount: document.getElementById('colorCount'),
      deltaESensitivity: document.getElementById('deltaESensitivity'),
      deltaEValue: document.getElementById('deltaEValue'),
      paletteDiv: document.getElementById('palette'),
      colorMaps: document.getElementById('colorMaps'),
      kmeansSettings: document.getElementById('kmeansSettings'),
      backgroundSettings: document.getElementById('backgroundSettings'),
      bgColorPicker: document.getElementById('bgColorPicker'),
      currentBgColor: document.getElementById('currentBgColor'),
      bgEdgePercent: document.getElementById('bgEdgePercent'),
      autoDetectBgBtn: document.getElementById('autoDetectBgBtn')
    };
    
    this.bindEvents();
    
    // Инициализация значений по умолчанию
    const params = window.appParameters;
    if (this.elements.clusteringMethod) {
      this.elements.clusteringMethod.value = params.colorAnalysis.clusteringMethods.default;
      this.updateMethodInterface();
    }
  }
  
  bindEvents() {
    // Получаем параметры задержек
    const params = window.appParameters;
    
    // Debouncing для тяжелых операций с requestAnimationFrame
    let paletteTimeout;
    const debouncedExtractPalette = () => {
      clearTimeout(paletteTimeout);
      paletteTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          this.extractPalette();
        });
      }, params.performance.delays.paletteExtraction);
    };
    
    
    // Обработчики для метода кластеризации
    this.elements.clusteringMethod?.addEventListener('change', () => {
      this.updateMethodInterface();
      this.extractPalette(); // Без debouncing для dropdown
    });
    
    // Обработчики для количества цветов
    this.elements.colorCount?.addEventListener('change', () => {
      this.extractPalette(); // Без debouncing для dropdown
    });
    
    // Обработчик для ползунка чувствительности дельта Е
    this.elements.deltaESensitivity?.addEventListener('input', (e) => {
      if (this.elements.deltaEValue) {
        this.elements.deltaEValue.textContent = e.target.value;
      }
      debouncedExtractPalette();
    });
    
    // Debouncing для фоновых настроек
    let bgTimeout;
    const debouncedBackgroundRecalc = () => {
      clearTimeout(bgTimeout);
      bgTimeout = setTimeout(() => {
        this.recalculateBackgroundColor();
      }, params.performance.delays.backgroundRecalc);
    };
    
    // Обработчики для настроек фона
    const bgColorDisplay = document.getElementById('bgColorDisplay');
    bgColorDisplay?.addEventListener('click', () => {
      // Открываем единый редактор цвета как в других разделах
      const current = this.app.state.backgroundColor || '#ffffff';
      this.openColorEditor(current, (selected) => {
        if (selected) {
          this.setBackgroundColorAndUpdate(selected);
        }
      });
    });
    
    this.elements.bgColorPicker?.addEventListener('input', (e) => {
      this.setBackgroundColorAndUpdate(e.target.value);
      // Обновляем отображение
      if (bgColorDisplay) {
        bgColorDisplay.style.background = e.target.value;
      }
    });
    
    this.elements.bgEdgePercent?.addEventListener('input', debouncedBackgroundRecalc);
    this.elements.bgEdgePercent?.addEventListener('change', () => {
      this.recalculateBackgroundColor(); // Без debouncing для окончательного изменения
    });
    
    // Обработчик для кнопки автоматического определения фона
    this.elements.autoDetectBgBtn?.addEventListener('click', () => {
      this.autoDetectBackground();
    });
    
    // Обработчики для предустановленных цветов фона
    this.elements.backgroundSettings?.querySelectorAll('.bg-color-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const bgColor = btn.getAttribute('data-bg');
        if (bgColor) {
          this.setBackgroundColorAndUpdate(bgColor);
        }
      });
    });
  }
  
  setBackgroundColorAndUpdate(color) {
    this.app.setBackgroundColor(color);
    
    // Обновляем все элементы отображения цвета фона
    const bgColorDisplay = document.getElementById('bgColorDisplay');
    if (bgColorDisplay) {
      bgColorDisplay.style.background = color;
    }
    if (this.elements.bgColorPicker) {
      this.elements.bgColorPicker.value = color;
    }
    
    // Обновляем текстовое отображение цвета
    const currentBgColor = document.getElementById('currentBgColor');
    if (currentBgColor) {
      currentBgColor.textContent = color;
    }
    
    // Реактивное обновление палитры и карт при изменении фона
    if (this.app.state.currentPalette.length > 0) {
      // Обновляем первый элемент палитры (фон)
      const newPalette = [...this.app.state.currentPalette];
      newPalette[0] = color;
      this.app.setPalette(newPalette);
      
      // Пересчитываем карты глубины
      this.generateColorMaps();
      
      // Обновляем сопоставление с фактической палитрой
      const syncEl = document.getElementById('syncWithCalculated');
      if (this.app.actualColors && syncEl && syncEl.checked) {
        this.app.actualColors.syncActualWithCalculated();
      }
    }
  }

  updateMethodInterface() {
    // Теперь у нас единый метод кластеризации на основе k-means
    // Всегда показываем настройки k-means с ползунком дельта Е
    if (this.elements.kmeansSettings) {
      this.elements.kmeansSettings.style.display = 'block';
    }
  }
  
  
  // Методы для управления индикаторами загрузки
  showPaletteLoading() {
    if (this.loadingElements.paletteOverlay) {
      this.loadingElements.paletteOverlay.classList.add('active');
    }
  }
  
  hidePaletteLoading() {
    if (this.loadingElements.paletteOverlay) {
      this.loadingElements.paletteOverlay.classList.remove('active');
    }
  }
  

  extractPalette() {
    // Показываем индикатор загрузки
    this.showPaletteLoading();
    
    const secondImg = document.getElementById('secondImg');
    if (!secondImg.src) {
      this.hidePaletteLoading();
      return;
    }
    
    // Проверяем, что изображение загружено
    if (!secondImg.complete || !secondImg.naturalWidth) {
      setTimeout(() => this.extractPalette(), 50);
      return;
    }
    
    // Дополнительная проверка для мобильных устройств
    if (this.isMobileDevice() && secondImg.naturalWidth === 0) {
      setTimeout(() => this.extractPalette(), 100);
      return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = secondImg.naturalWidth;
    canvas.height = secondImg.naturalHeight;
    
    try {
      ctx.drawImage(secondImg, 0, 0);
      var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch (error) {
      console.error('Memory error during image processing:', error);
      this.hidePaletteLoading();
      
      if (this.app.telegramAPI) {
        this.app.telegramAPI.showAlert('Ошибка: недостаточно памяти для обработки изображения. Попробуйте уменьшить разрешение.');
      } else {
        alert('Ошибка: недостаточно памяти для обработки изображения. Попробуйте уменьшить разрешение.');
      }
      return;
    }
    
    // Собираем цвета из изображения (оптимизированное семплирование)
    let sampleColors = [];
    
    // Получаем параметры производительности
    const params = window.appParameters;
    const imageSize = canvas.width * canvas.height;
    let step;
    
    if (this.isMobileDevice()) {
      // На мобильных используем параметры из конфигурации
      const mobileStep = params.performance.mobile.samplingStep;
      if (imageSize > 200000) { // Большие изображения
        step = mobileStep * 2; // Экстремально большой шаг
      } else if (imageSize > 100000) { // Средние изображения
        step = mobileStep * 1.5; 
      } else if (imageSize > 50000) { // Маленькие изображения
        step = mobileStep;
      } else {
        step = mobileStep / 2; // Очень маленькие
      }
    } else {
      step = params.performance.desktop.samplingStep; // Десктоп
    }
    
    for (let i = 0; i < data.length; i += step) {
      sampleColors.push([data[i], data[i + 1], data[i + 2]]);
    }
    
    // Ограничения для мобильных и десктопа из параметров
    const maxSamples = this.isMobileDevice() ? 
      params.performance.mobile.maxSamples : 
      params.performance.desktop.maxSamples;
    if (sampleColors.length > maxSamples) {
      const ratio = Math.floor(sampleColors.length / maxSamples);
      sampleColors = sampleColors.filter((_, index) => index % ratio === 0);
    }
    
    console.log(`Image size: ${imageSize}, samples: ${sampleColors.length}, step: ${step}`);
    
    const method = this.elements.clusteringMethod.value;
    let resultColors = [];
    
    // Единый метод кластеризации на основе k-means с регулировкой дельта Е
    const total = parseInt(this.elements.colorCount.value) || params.colorAnalysis.colorCount.default;
    const deltaESensitivity = parseInt(this.elements.deltaESensitivity?.value) || 25;
    resultColors = this.unifiedClustering(sampleColors, total, deltaESensitivity);
    
    // Преобразуем цвета в HEX формат
    const palette = resultColors.map(c => this.colorUtils.rgbToHex(c[0], c[1], c[2]));
    
    // Добавляем цвет фона в начало палитры
    const defaultBgColor = params.background.defaultColor;
    palette.unshift(this.app.state.backgroundColor || defaultBgColor);
    
    // Обновляем состояние приложения
    this.app.setPalette(palette);
    
    // Обновляем UI
    this.renderPalette();
    this.generateColorMaps();
    
    // Активируем следующие разделы
    document.getElementById('actualColorsSection').classList.add('active');
    document.getElementById('stringartSection').classList.add('active');
    
    // Скрываем индикатор загрузки
    this.hidePaletteLoading();
    
  }
  
  // Определение мобильного устройства и Telegram
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768 ||
           ('ontouchstart' in window) ||
           (window.Telegram && window.Telegram.WebApp);
  }
  
  // Единый метод кластеризации на основе k-means с регулировкой дельта Е
  unifiedClustering(colors, k, deltaESensitivity, maxIterations = 100) {
    // Сначала выполняем k-means кластеризацию
    let centroids = this.kMeansClustering(colors, k, maxIterations);
    
    // Затем применяем фильтрацию по дельта Е для удаления похожих цветов
    return this.filterSimilarColors(centroids, deltaESensitivity);
  }
  
  // k-means алгоритм кластеризации
  kMeansClustering(colors, k, maxIterations = 100) {
    let centroids = this.initializeCentroids(colors, k);
    let clusters = Array(k).fill().map(() => []);
    let iterations = 0;
    
    while (iterations < maxIterations) {
      clusters = Array(k).fill().map(() => []);
      
      for (const color of colors) {
        const nearestIndex = this.findNearestCentroid(color, centroids);
        clusters[nearestIndex].push(color);
      }
      
      const newCentroids = clusters.map(cluster => this.calculateNewCentroid(cluster));
      
      let centroidsChanged = false;
      for (let i = 0; i < k; i++) {
        if (this.colorUtils.deltaE(this.colorUtils.rgbToLab(...centroids[i]), this.colorUtils.rgbToLab(...newCentroids[i])) > 1) {
          centroidsChanged = true;
          break;
        }
      }
      
      if (!centroidsChanged) break;
      
      centroids = newCentroids;
      iterations++;
    }
    
    return centroids;
  }
  
  initializeCentroids(colors, k) {
    const centroids = [];
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * colors.length);
      centroids.push([...colors[randomIndex]]);
    }
    return centroids;
  }
  
  findNearestCentroid(color, centroids) {
    let minDistance = Infinity;
    let nearestIndex = 0;
    
    for (let i = 0; i < centroids.length; i++) {
      const distance = this.colorUtils.deltaE(this.colorUtils.rgbToLab(...color), this.colorUtils.rgbToLab(...centroids[i]));
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }
    
    return nearestIndex;
  }
  
  calculateNewCentroid(cluster) {
    if (cluster.length === 0) return [0, 0, 0];
    
    const sumR = cluster.reduce((sum, color) => sum + color[0], 0);
    const sumG = cluster.reduce((sum, color) => sum + color[1], 0);
    const sumB = cluster.reduce((sum, color) => sum + color[2], 0);
    
    return [
      Math.round(sumR / cluster.length),
      Math.round(sumG / cluster.length),
      Math.round(sumB / cluster.length)
    ];
  }
  
  // Фильтрация похожих цветов по дельта Е
  filterSimilarColors(colors, minDeltaE) {
    if (colors.length === 0) return colors;
    
    const filtered = [];
    const colorsWithLab = colors.map(color => ({
      rgb: color,
      lab: this.colorUtils.rgbToLab(color[0], color[1], color[2])
    }));
    
    // Сортируем цвета по яркости (L компонента в LAB)
    colorsWithLab.sort((a, b) => b.lab[0] - a.lab[0]);
    
    for (const colorData of colorsWithLab) {
      // Проверяем, есть ли уже похожий цвет в отфильтрованном списке
      const isSimilar = filtered.some(existingColor => {
        const existingLab = this.colorUtils.rgbToLab(existingColor[0], existingColor[1], existingColor[2]);
        return this.colorUtils.deltaE(colorData.lab, existingLab) < minDeltaE;
      });
      
      if (!isSimilar) {
        filtered.push(colorData.rgb);
      }
    }
    
    return filtered;
  }
  
  
  renderPalette() {
    this.elements.paletteDiv.innerHTML = '';
    
    // Очищаем старые скрытые color input из body
    const oldColorInputs = document.querySelectorAll('input[type="color"][style*="display: none"]');
    oldColorInputs.forEach(input => {
      if (input.parentNode === document.body) {
        document.body.removeChild(input);
      }
    });
    
    this.app.state.currentPalette.forEach((color, idx) => {
      if (idx === 0) return; // Пропускаем фон
      
      const item = document.createElement('div');
      item.className = 'color-item';
      
      // Детекция Telegram WebApp
      const isTelegram = window.Telegram?.WebApp?.platform;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
      
      console.log('Детекция платформы для элемента', idx, ':', {
        isTelegram, 
        isMobile, 
        userAgent: navigator.userAgent,
        telegramWebApp: !!window.Telegram?.WebApp,
        telegramPlatform: window.Telegram?.WebApp?.platform
      });
      
      // Создаем кружок как div (всегда)
      const circle = document.createElement('div');
      circle.style.width = '24px';
      circle.style.height = '24px';
      circle.style.borderRadius = '50%';
      circle.style.backgroundColor = color;
      circle.style.border = '2px solid #fff';
      circle.style.cursor = 'pointer';
      circle.style.flexShrink = '0';
      
      let colorInput = null;
      
      if (!isTelegram && !isMobile) {
        // Только на десктопе (не Telegram) используем input[type="color"]
        colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.style.display = 'none';
      }
      
      const code = document.createElement('input');
      code.type = 'text';
      code.value = color;
      code.className = 'color-code';
      code.maxLength = 7;
      
      // Убираем дополнительные кнопки пипеток по просьбе пользователя
      
      // События для изменения цвета — открываем единый RGB-редактор
      circle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.openColorEditor(color, (selectedColor) => {
          if (selectedColor) {
            circle.style.backgroundColor = selectedColor;
            code.value = selectedColor;
            this.updatePaletteColor(idx, selectedColor);
          }
        });
      });
      
      // Общий обработчик для текстового поля
      code.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(code.value)) {
          circle.style.backgroundColor = code.value;
          if (colorInput) {
            colorInput.value = code.value;
          }
          this.updatePaletteColor(idx, code.value);
        }
      });
      
      const controls = document.createElement('div');
      controls.className = 'color-controls';
      controls.appendChild(code);
      // Убираем добавление кнопки пипетки
      
      item.appendChild(circle);
      item.appendChild(controls);
      // Добавляем скрытый input в body только если он существует
      if (colorInput) {
        document.body.appendChild(colorInput);
      }
      this.elements.paletteDiv.appendChild(item);
    });
  }
  
  // Единый редактор цвета (HEX/RGB + пипетка)
  openColorEditor(currentColor, onApply) {
    const modal = document.getElementById('colorEditorModal');
    const hexInput = document.getElementById('colorEditorHex');
    const rInput = document.getElementById('colorEditorR');
    const gInput = document.getElementById('colorEditorG');
    const bInput = document.getElementById('colorEditorB');
    const okBtn = document.getElementById('colorEditorOk');
    const cancelBtn = document.getElementById('colorEditorCancel');
    const pipetteBtn = document.getElementById('colorEditorPipette');
    const preview = document.getElementById('colorEditorPreview');
    const svCanvas = document.getElementById('colorEditorSV');
    const hueCanvas = document.getElementById('colorEditorHue');
    
    if (!modal || !hexInput || !rInput || !gInput || !bInput || !okBtn || !cancelBtn || !pipetteBtn || !preview || !svCanvas || !hueCanvas) {
      // Fallback — если по какой-то причине нет редактора, используем палитру
      return this.showColorPalette(onApply);
    }
    
    let currentHue = 0, currentS = 0, currentV = 1;

    const setFromHex = (hex) => {
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
      const [r, g, b] = this.colorUtils.hexToRgb(hex);
      hexInput.value = hex.toLowerCase();
      rInput.value = r;
      gInput.value = g;
      bInput.value = b;
      preview.style.background = hex;
      currentHex = hex.toLowerCase();
      // Обновляем HSV значения без перерисовки (инициализируем позже)
      const hsv = rgbToHsv ? rgbToHsv(r, g, b) : [0, 0, 1];
      currentHue = hsv[0];
      currentS = hsv[1];
      currentV = hsv[2];
    };
    
    const clamp255 = (n) => Math.max(0, Math.min(255, parseInt(n || 0)));
    const setFromRgb = () => {
      const r = clamp255(rInput.value);
      const g = clamp255(gInput.value);
      const b = clamp255(bInput.value);
      const hex = this.colorUtils.rgbToHex(r, g, b);
      hexInput.value = hex;
      preview.style.background = hex;
      currentHex = hex;
      const hsv = rgbToHsv(r, g, b);
      currentHue = hsv[0];
      currentS = hsv[1];
      currentV = hsv[2];
      if (typeof drawHue === 'function') drawHue();
      if (typeof drawSV === 'function') drawSV();
    };
    
    let currentHex = currentColor && /^#[0-9A-Fa-f]{6}$/.test(currentColor) ? currentColor : '#ffffff';
    setFromHex(currentHex);
    
    const onHexInput = () => setFromHex(hexInput.value.trim());
    const onR = () => setFromRgb();
    const onG = () => setFromRgb();
    const onB = () => setFromRgb();
    const normalizeHex = (hex) => {
      if (typeof hex !== 'string') return null;
      let v = hex.trim().toLowerCase();
      if (!v.startsWith('#')) v = '#' + v;
      if (/^#[0-9a-f]{6}$/.test(v)) return v;
      return null;
    };
    const onOk = () => {
      // Берём актуальное значение из HEX поля, иначе собираем из RGB
      let finalHex = normalizeHex(hexInput.value) || this.colorUtils.rgbToHex(
        Math.max(0, Math.min(255, parseInt(rInput.value || 0))),
        Math.max(0, Math.min(255, parseInt(gInput.value || 0))),
        Math.max(0, Math.min(255, parseInt(bInput.value || 0)))
      );
      if (onApply) onApply(finalHex);
      close();
    };
    const onCancel = () => close();
    const onPipette = () => {
      const secondImg = document.getElementById('secondImg');
      const overlay = document.getElementById('pipetteOverlay');
      const pipetteImg = document.getElementById('pipetteImg');
      if (!secondImg || !secondImg.src) {
        if (this.app.telegramAPI) this.app.telegramAPI.showAlert('Сначала подготовьте изображение во втором шаге');
        else alert('Сначала подготовьте изображение во втором шаге');
        return;
      }
      window.__onPipettePick = (hex) => {
        try { setFromHex(hex); } catch (_) {}
      };
      pipetteImg.src = secondImg.src;
      overlay.style.display = 'flex';
    };
    
    // Scroll lock helpers
    let savedScrollY = 0;
    let savedOverflow = '';
    let savedPosition = '';
    let savedTop = '';
    let savedWidth = '';
    const preventTouchScroll = (e) => { e.preventDefault(); };
    const scrollContainer = document.querySelector('.container');
    let savedContainerOverflow = '';
    let savedContainerPosition = '';

    const lockScroll = () => {
      try {
        savedScrollY = window.scrollY || window.pageYOffset || 0;
        savedOverflow = document.body.style.overflow;
        savedPosition = document.body.style.position;
        savedTop = document.body.style.top;
        savedWidth = document.body.style.width;
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.width = '100%';
        modal.addEventListener('touchmove', preventTouchScroll, { passive: false });
        if (scrollContainer) {
          savedContainerOverflow = scrollContainer.style.overflow;
          savedContainerPosition = scrollContainer.style.position;
          scrollContainer.style.overflow = 'hidden';
          scrollContainer.style.position = 'relative';
        }
      } catch (_) {}
    };

    const unlockScroll = () => {
      try {
        modal.removeEventListener('touchmove', preventTouchScroll);
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.body.style.overflow = savedOverflow;
        document.body.style.position = savedPosition;
        document.body.style.top = savedTop;
        document.body.style.width = savedWidth;
        if (scrollContainer) {
          scrollContainer.style.overflow = savedContainerOverflow;
          scrollContainer.style.position = savedContainerPosition;
        }
        window.scrollTo(0, savedScrollY || 0);
      } catch (_) {}
    };

    const close = () => {
      modal.style.display = 'none';
      unlockScroll();
      hexInput.removeEventListener('input', onHexInput);
      rInput.removeEventListener('input', onR);
      gInput.removeEventListener('input', onG);
      bInput.removeEventListener('input', onB);
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      pipetteBtn.removeEventListener('click', onPipette);
      modal.removeEventListener('click', onBackdropClick);
    };
    
    hexInput.addEventListener('input', onHexInput);
    rInput.addEventListener('input', onR);
    gInput.addEventListener('input', onG);
    bInput.addEventListener('input', onB);
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    pipetteBtn.addEventListener('click', onPipette);
    
    // Открываем модалку как центрированный фиксированный оверлей
    // Убедимся, что модалка в body, иначе fixed может привязываться к родителю с transform
    try {
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
    modal.style.display = 'flex';

    // ==== HSV Picker implementation ====
    const svCtx = svCanvas.getContext('2d');
    const hueCtx = hueCanvas.getContext('2d');
    function hsvToRgb(h, s, v) {
      let c = v * s;
      let x = c * (1 - Math.abs((h / 60) % 2 - 1));
      let m = v - c;
      let r1 = 0, g1 = 0, b1 = 0;
      if (h < 60) { r1 = c; g1 = x; }
      else if (h < 120) { r1 = x; g1 = c; }
      else if (h < 180) { g1 = c; b1 = x; }
      else if (h < 240) { g1 = x; b1 = c; }
      else if (h < 300) { r1 = x; b1 = c; }
      else { r1 = c; b1 = x; }
      return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
    }
    function rgbToHsv(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      if (d === 0) h = 0;
      else if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * (((b - r) / d) + 2);
      else h = 60 * (((r - g) / d) + 4);
      if (h < 0) h += 360;
      const s = max === 0 ? 0 : d / max;
      const v = max;
      return [h, s, v];
    }
    function drawHue() {
      const w = hueCanvas.width, h = hueCanvas.height;
      const gradient = hueCtx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(1/6, '#ffff00');
      gradient.addColorStop(2/6, '#00ff00');
      gradient.addColorStop(3/6, '#00ffff');
      gradient.addColorStop(4/6, '#0000ff');
      gradient.addColorStop(5/6, '#ff00ff');
      gradient.addColorStop(1, '#ff0000');
      hueCtx.fillStyle = gradient;
      hueCtx.fillRect(0, 0, w, h);
      hueCtx.strokeStyle = '#fff';
      hueCtx.lineWidth = 2;
      const y = (currentHue / 360) * h;
      hueCtx.beginPath();
      hueCtx.rect(0.5, y - 2, w - 1, 4);
      hueCtx.stroke();
    }
    function drawSV() {
      const w = svCanvas.width, h = svCanvas.height;
      const base = hsvToRgb(currentHue, 1, 1);
      const gradX = svCtx.createLinearGradient(0, 0, w, 0);
      gradX.addColorStop(0, 'rgba(255,255,255,1)');
      gradX.addColorStop(1, `rgb(${base[0]},${base[1]},${base[2]})`);
      svCtx.fillStyle = gradX;
      svCtx.fillRect(0, 0, w, h);
      const gradY = svCtx.createLinearGradient(0, 0, 0, h);
      gradY.addColorStop(0, 'rgba(0,0,0,0)');
      gradY.addColorStop(1, 'rgba(0,0,0,1)');
      svCtx.fillStyle = gradY;
      svCtx.fillRect(0, 0, w, h);
      const x = currentS * w;
      const y = (1 - currentV) * h;
      svCtx.strokeStyle = '#fff';
      svCtx.lineWidth = 2;
      svCtx.beginPath();
      svCtx.arc(x, y, 6, 0, Math.PI * 2);
      svCtx.stroke();
    }
    function applyFromHSV() {
      const rgb = hsvToRgb(currentHue, currentS, currentV);
      const hex = this.colorUtils.rgbToHex(rgb[0], rgb[1], rgb[2]);
      currentHex = hex;
      hexInput.value = hex;
      rInput.value = rgb[0]; gInput.value = rgb[1]; bInput.value = rgb[2];
      preview.style.background = hex;
    }
    function updateFromSV(clientX, clientY) {
      const rect = svCanvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      currentS = x / rect.width;
      currentV = 1 - (y / rect.height);
      applyFromHSV();
      drawSV();
    }
    function updateFromHue(clientY) {
      const rect = hueCanvas.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      currentHue = (y / rect.height) * 360;
      applyFromHSV();
      drawHue();
      drawSV();
    }
    const svPointer = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      updateFromSV(pt.clientX, pt.clientY);
      e.preventDefault();
    };
    const huePointer = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      updateFromHue(pt.clientY);
      e.preventDefault();
    };
    const addDrag = (el, handler) => {
      let active = false;
      const onDown = (e) => { active = true; handler(e); };
      const onMove = (e) => { if (!active) return; handler(e); };
      const onUp = () => { active = false; };
      el.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      el.addEventListener('touchstart', onDown, { passive: false });
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    };
    drawHue();
    drawSV();
    addDrag(svCanvas, svPointer);
    addDrag(hueCanvas, huePointer);
  }

  // Метод для выбора цвета через палитру
  showTelegramColorPicker(idx, currentColor, circle, code) {
    this.showColorPalette((selectedColor) => {
      if (selectedColor) {
        circle.style.backgroundColor = selectedColor;
        code.value = selectedColor;
        this.updatePaletteColor(idx, selectedColor);
        
        // Haptic feedback для Telegram
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      }
    });
  }
  
  // Показать модальное окно с палитрой цветов
  showColorPalette(callback) {
    console.log('showColorPalette вызван');
    const modal = document.getElementById('colorPaletteModal');
    const grid = document.getElementById('colorPaletteGrid');
    const closeBtn = document.getElementById('closePaletteModal');
    
    console.log('Элементы найдены:', {modal: !!modal, grid: !!grid, closeBtn: !!closeBtn});
    
    if (!modal || !grid || !closeBtn) {
      console.error('Не найдены элементы модального окна');
      return;
    }
    
    // Очищаем сетку
    grid.innerHTML = '';
    
    // Популярные цвета для палитры
    const colors = [
      '#ff0000', '#ff4500', '#ff8c00', '#ffd700', '#ffff00', '#adff2f',
      '#00ff00', '#00ff7f', '#00ffff', '#0080ff', '#0000ff', '#8000ff',
      '#ff00ff', '#ff1493', '#ff69b4', '#ffc0cb', '#ffffff', '#f0f0f0',
      '#d3d3d3', '#a9a9a9', '#808080', '#696969', '#404040', '#000000',
      '#8b0000', '#b22222', '#dc143c', '#cd5c5c', '#f08080', '#fa8072',
      '#e9967a', '#ffa07a', '#ffa500', '#ff7f50', '#ff6347', '#ff4500'
    ];
    
    // Создаем кружки цветов
    colors.forEach(color => {
      const colorCircle = document.createElement('div');
      colorCircle.style.width = '36px';
      colorCircle.style.height = '36px';
      colorCircle.style.borderRadius = '50%';
      colorCircle.style.backgroundColor = color;
      colorCircle.style.border = '2px solid #fff';
      colorCircle.style.cursor = 'pointer';
      colorCircle.style.transition = 'transform 0.2s ease';
      
      colorCircle.addEventListener('mouseover', () => {
        colorCircle.style.transform = 'scale(1.1)';
      });
      
      colorCircle.addEventListener('mouseout', () => {
        colorCircle.style.transform = 'scale(1)';
      });
      
      colorCircle.addEventListener('click', () => {
        modal.style.display = 'none';
        callback(color);
      });
      
      grid.appendChild(colorCircle);
    });
    
    // Показываем модальное окно
    console.log('Показываем модальное окно');
    modal.style.display = 'flex';
    // Центрируем и блокируем прокрутку страницы, затемняем весь UI
    lockScroll();
    const onBackdropClick = (e) => { if (e.target === modal) close(); };
    modal.addEventListener('click', onBackdropClick);
    console.log('Модальное окно показано, display:', modal.style.display);
    
    // Обработчик закрытия
    const closeModal = () => {
      modal.style.display = 'none';
      callback(null);
    };
    
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
  }
  
  updatePaletteColor(index, color) {
    const newPalette = [...this.app.state.currentPalette];
    newPalette[index] = color;
    this.app.setPalette(newPalette);
    this.generateColorMaps();
    
    // Обновляем сопоставление с фактической палитрой
    const syncEl = document.getElementById('syncWithCalculated');
    const autoEl = document.getElementById('autoMatchColors');
    if (this.app.actualColors && syncEl && syncEl.checked) {
      this.app.actualColors.syncActualWithCalculated();
    } else if (this.app.actualColors && autoEl && autoEl.checked) {
      this.app.actualColors.matchColors();
    }
  }
  
  generateColorMaps() {
    if (!this.app.mapGenerator) {
      console.warn('MapGenerator не инициализирован');
      return;
    }

    // Используем централизованный MapGenerator
    this.app.mapGenerator.generateColorMaps(
      this.app.state.currentPalette,
      'colorMaps',
      {
        showLabels: true,
        labelPrefix: 'ЦВЕТ',
        borderWidth: '4px',
        useCache: true,
        showLoading: true
      }
    );
  }
  
  openPipette(colorIndex) {
    const pipetteOverlay = document.getElementById('pipetteOverlay');
    const pipetteImg = document.getElementById('pipetteImg');
    const secondImg = document.getElementById('secondImg');
    
    window.__activePipetteIndex = colorIndex;
    pipetteImg.src = secondImg.src;
    pipetteOverlay.style.display = 'flex';
  }
  
  recalculateBackgroundColor() {
    const previewImg = document.getElementById('previewImg');
    if (previewImg && previewImg.src && previewImg.complete && previewImg.naturalWidth > 0) {
      const percent = parseInt(this.elements.bgEdgePercent.value) || 10;
      const bgColor = Utils.getAverageEdgeColor(previewImg, percent);
      this.app.setBackgroundColor(bgColor);
      
      // Пересчитываем палитру и карты при изменении фона
      if (this.app.state.currentPalette.length > 0) {
        // Обновляем первый элемент палитры (фон)
        const newPalette = [...this.app.state.currentPalette];
        newPalette[0] = bgColor;
        this.app.setPalette(newPalette);
        
        // Пересчитываем карты глубины
        this.generateColorMaps();
        
        // Обновляем сопоставление с фактической палитрой
        const syncEl = document.getElementById('syncWithCalculated');
        if (this.app.actualColors && syncEl && syncEl.checked) {
          this.app.actualColors.syncActualWithCalculated();
        }
      }
    }
  }
  
  autoDetectBackground() {
    const previewImg = document.getElementById('previewImg');
    if (!previewImg || !previewImg.src) {
      // Показываем сообщение пользователю, если изображение не загружено
      if (this.app.telegramAPI) {
        this.app.telegramAPI.showAlert('Сначала загрузите изображение для автоматического определения цвета фона');
      } else {
        alert('Сначала загрузите изображение для автоматического определения цвета фона');
      }
      return;
    }
    
    // Если изображение еще загружается, ждем
    if (!previewImg.complete || !previewImg.naturalWidth) {
      let retryCount = 0;
      const maxRetries = 15;
      
      const retryDetection = () => {
        retryCount++;
        if (retryCount > maxRetries) {
          if (this.app.telegramAPI) {
            this.app.telegramAPI.showAlert('Не удалось определить цвет фона. Попробуйте еще раз.');
          } else {
            alert('Не удалось определить цвет фона. Попробуйте еще раз.');
          }
          return;
        }
        
        if (previewImg.complete && previewImg.naturalWidth > 0) {
          this.performAutoDetection();
        } else {
          setTimeout(retryDetection, 150);
        }
      };
      
      setTimeout(retryDetection, 100);
      return;
    }
    
    this.performAutoDetection();
  }
  
  performAutoDetection() {
    // Выполняем автоматическое определение цвета фона
    this.recalculateBackgroundColor();
    
  }
  
  reset() {
    // Сброс UI элементов
    this.elements.paletteDiv.innerHTML = '';
    this.elements.colorMaps.innerHTML = '';
    document.getElementById('paletteSection').classList.remove('active');
    
    // Сброс значений
    const params = window.appParameters;
    this.elements.clusteringMethod.value = 'kmeans';
    this.elements.colorCount.value = params.colorAnalysis.colorCount.default;
    if (this.elements.deltaESensitivity) {
      this.elements.deltaESensitivity.value = 25;
    }
    if (this.elements.deltaEValue) {
      this.elements.deltaEValue.textContent = '25';
    }
    this.updateMethodInterface();
  }
  
  onStateChange(state) {
    // Реагируем на изменения состояния приложения
    if (state.currentPalette !== this.lastPalette) {
      this.lastPalette = state.currentPalette;
      this.renderPalette();
      this.generateColorMaps();
    }
    
    if (state.backgroundColor !== this.lastBackgroundColor) {
      this.lastBackgroundColor = state.backgroundColor;
      this.updateBackgroundDisplay(state.backgroundColor);
    }
  }
  
  updateBackgroundDisplay(color) {
    // Обновляем текст HEX без заливки фоном
    if (this.elements.currentBgColor) {
      this.elements.currentBgColor.textContent = color;
      this.elements.currentBgColor.style.background = '';
    }
    // Обновляем цвет в кастомном кружке
    const bgColorDisplay = document.getElementById('bgColorDisplay');
    if (bgColorDisplay) {
      bgColorDisplay.style.background = color;
    }
    
    if (this.elements.bgColorPicker) {
      this.elements.bgColorPicker.value = color;
    }
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ColorAnalyzer;
}
