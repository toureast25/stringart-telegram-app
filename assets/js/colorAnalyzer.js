/**
 * ColorAnalyzer - Модуль для анализа цветов и кластеризации
 * Отвечает за извлечение палитры, k-means кластеризацию и работу с цветами
 */

class ColorAnalyzer {
  constructor(app) {
    this.app = app;
    
    // Кеш для оптимизации производительности
    this.cache = {
      lastImageSrc: null,
      lastPalette: null,
      colorMaps: null
    };
    
    // Элементы индикаторов загрузки
    this.loadingElements = {
      paletteOverlay: document.getElementById('paletteLoadingOverlay'),
      masksOverlay: document.getElementById('masksLoadingOverlay')
    };
    
    this.elements = {
      clusteringMethod: document.getElementById('clusteringMethod'),
      colorCount: document.getElementById('colorCount'),
      minDeltaEInput: document.getElementById('minDeltaE'),
      darkCount: document.getElementById('darkCount'),
      midCount: document.getElementById('midCount'),
      lightCount: document.getElementById('lightCount'),
      paletteDiv: document.getElementById('palette'),
      colorMaps: document.getElementById('colorMaps'),
      kmeansSettings: document.getElementById('kmeansSettings'),
      tonesSettings: document.getElementById('tonesSettings'),
      backgroundSettings: document.getElementById('backgroundSettings'),
      bgColorPicker: document.getElementById('bgColorPicker'),
      currentBgColor: document.getElementById('currentBgColor'),
      bgEdgePercent: document.getElementById('bgEdgePercent'),
      autoDetectBgBtn: document.getElementById('autoDetectBgBtn')
    };
    
    this.bindEvents();
  }
  
  bindEvents() {
    // Debouncing для тяжелых операций с requestAnimationFrame
    let paletteTimeout;
    const debouncedExtractPalette = () => {
      clearTimeout(paletteTimeout);
      paletteTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          this.extractPalette();
        });
      }, 36); // 36ms задержка для тяжелых операций
    };
    
    let tonesTimeout;
    const debouncedTonesChange = () => {
      clearTimeout(tonesTimeout);
      tonesTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          this.handleTonesCountChange();
        });
      }, 24); // 24ms для средних операций
    };
    
    // Обработчики для метода кластеризации
    this.elements.clusteringMethod?.addEventListener('change', () => {
      this.updateMethodInterface();
      this.extractPalette(); // Без debouncing для dropdown
    });
    
    // Обработчики для количества цветов
    this.elements.colorCount?.addEventListener('change', () => {
      if (this.elements.clusteringMethod.value === 'tones') {
        this.updateTonesProportions();
      }
      this.extractPalette(); // Без debouncing для dropdown
    });
    
    // Обработчики для метода по тонам с debouncing
    this.elements.minDeltaEInput?.addEventListener('input', debouncedExtractPalette);
    this.elements.darkCount?.addEventListener('input', debouncedTonesChange);
    this.elements.midCount?.addEventListener('input', debouncedTonesChange);
    this.elements.lightCount?.addEventListener('input', debouncedTonesChange);
    
    // Debouncing для фоновых настроек
    let bgTimeout;
    const debouncedBackgroundRecalc = () => {
      clearTimeout(bgTimeout);
      bgTimeout = setTimeout(() => {
        this.recalculateBackgroundColor();
      }, 24);
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
    const method = this.elements.clusteringMethod.value;
    
    if (method === 'kmeans') {
      this.elements.kmeansSettings.style.display = 'none';
      this.elements.tonesSettings.style.display = 'none';
    } else if (method === 'tones') {
      this.elements.kmeansSettings.style.display = 'none';
      this.elements.tonesSettings.style.display = 'block';
      this.updateTonesProportions();
    }
  }
  
  updateTonesProportions() {
    const total = parseInt(this.elements.colorCount.value) || 3;
    const perGroup = Math.floor(total / 3);
    const remainder = total % 3;
    
    this.elements.darkCount.value = perGroup;
    this.elements.midCount.value = perGroup + remainder;
    this.elements.lightCount.value = perGroup;
  }
  
  handleTonesCountChange() {
    const darkN = parseInt(this.elements.darkCount.value) || 0;
    const midN = parseInt(this.elements.midCount.value) || 0;
    const lightN = parseInt(this.elements.lightCount.value) || 0;
    const total = darkN + midN + lightN;
    const currentTotal = parseInt(this.elements.colorCount.value) || 0;
    
    if (total > currentTotal) {
      this.elements.colorCount.value = total;
    }
    this.extractPalette();
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
  
  showMasksLoading() {
    if (this.loadingElements.masksOverlay) {
      this.loadingElements.masksOverlay.classList.add('active');
    }
  }
  
  hideMasksLoading() {
    if (this.loadingElements.masksOverlay) {
      this.loadingElements.masksOverlay.classList.remove('active');
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
    
    // Более агрессивное ограничение для мобильных при больших разрешениях
    const imageSize = canvas.width * canvas.height;
    let step;
    
    if (this.isMobileDevice()) {
      // На мобильных используем еще более агрессивный шаг
      if (imageSize > 200000) { // Большие изображения (> 200k пикселей)
        step = 4 * 24; // Экстремально большой шаг
      } else if (imageSize > 100000) { // Средние изображения
        step = 4 * 16; 
      } else if (imageSize > 50000) { // Маленькие изображения
        step = 4 * 12;
      } else {
        step = 4 * 8; // Очень маленькие
      }
    } else {
      step = 4 * 6; // Десктоп
    }
    
    for (let i = 0; i < data.length; i += step) {
      sampleColors.push([data[i], data[i + 1], data[i + 2]]);
    }
    
    // Еще более жесткие ограничения для мобильных
    const maxSamples = this.isMobileDevice() ? 2000 : 5000;
    if (sampleColors.length > maxSamples) {
      const ratio = Math.floor(sampleColors.length / maxSamples);
      sampleColors = sampleColors.filter((_, index) => index % ratio === 0);
    }
    
    console.log(`Image size: ${imageSize}, samples: ${sampleColors.length}, step: ${step}`);
    
    const method = this.elements.clusteringMethod.value;
    let resultColors = [];
    
    if (method === 'kmeans') {
      const total = parseInt(this.elements.colorCount.value) || 3;
      const centroids = this.kMeansClustering(sampleColors, total);
      resultColors = centroids;
    } else if (method === 'tones') {
      resultColors = this.clusterByTones(sampleColors);
    }
    
    // Преобразуем цвета в HEX формат
    const palette = resultColors.map(c => Utils.rgbToHex(c[0], c[1], c[2]));
    
    // Добавляем цвет фона в начало палитры
    palette.unshift(this.app.state.backgroundColor);
    
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
    
    // Специальная обработка для Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      try {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } catch (e) {
        // Haptic feedback не доступен
      }
    }
  }
  
  // Определение мобильного устройства и Telegram
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768 ||
           ('ontouchstart' in window) ||
           (window.Telegram && window.Telegram.WebApp);
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
        if (Utils.deltaE(Utils.rgbToLab(...centroids[i]), Utils.rgbToLab(...newCentroids[i])) > 1) {
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
      const distance = Utils.deltaE(Utils.rgbToLab(...color), Utils.rgbToLab(...centroids[i]));
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
  
  // Кластеризация по тонам
  clusterByTones(colors) {
    let colorsWithL = colors.map(rgb => {
      let lab = Utils.rgbToLab(rgb[0], rgb[1], rgb[2]);
      return { rgb, L: lab[0] };
    });
    colorsWithL.sort((a, b) => a.L - b.L);
    
    let n = colorsWithL.length;
    let borders = [Math.floor(n / 3), Math.floor(2 * n / 3)];
    let groups = [[], [], []];
    
    for (let i = 0; i < n; i++) {
      if (i < borders[0]) groups[0].push(colorsWithL[i].rgb);
      else if (i < borders[1]) groups[1].push(colorsWithL[i].rgb);
      else groups[2].push(colorsWithL[i].rgb);
    }
    
    let darkN = parseInt(this.elements.darkCount.value) || 0;
    let midN = parseInt(this.elements.midCount.value) || 0;
    let lightN = parseInt(this.elements.lightCount.value) || 0;
    
    let uniq = [];
    let filteredDark = this.filterColorsByDeltaE(groups[0], parseInt(this.elements.minDeltaEInput.value));
    let filteredMid = this.filterColorsByDeltaE(groups[1], parseInt(this.elements.minDeltaEInput.value));
    let filteredLight = this.filterColorsByDeltaE(groups[2], parseInt(this.elements.minDeltaEInput.value));
    
    uniq = uniq.concat(filteredDark.slice(0, darkN));
    uniq = uniq.concat(filteredMid.slice(0, midN));
    uniq = uniq.concat(filteredLight.slice(0, lightN));
    
    return uniq;
  }
  
  filterColorsByDeltaE(colors, minDeltaE) {
    let res = [];
    colors.forEach(c => {
      let lab = Utils.rgbToLab(c[0], c[1], c[2]);
      if (!res.some(r => Utils.deltaE(lab, r.lab) < minDeltaE)) {
        res.push({ rgb: c, lab });
      }
    });
    return res.map(r => r.rgb);
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
      const [r, g, b] = Utils.hexToRgb(hex);
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
      const hex = Utils.rgbToHex(r, g, b);
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
    const onOk = () => { close(); onApply && onApply(currentHex); };
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
      const hex = Utils.rgbToHex(rgb[0], rgb[1], rgb[2]);
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
    // Показываем индикатор загрузки масок
    this.showMasksLoading();
    
    const secondImg = document.getElementById('secondImg');
    if (!secondImg.src || this.app.state.currentPalette.length === 0) {
      this.hideMasksLoading();
      return;
    }
    
    // Проверяем кеш для оптимизации
    const currentImageSrc = secondImg.src;
    const currentPalette = JSON.stringify(this.app.state.currentPalette);
    
    if (this.cache.lastImageSrc === currentImageSrc && 
        this.cache.lastPalette === currentPalette && 
        this.cache.colorMaps) {
      // Используем кешированные маски
      this.elements.colorMaps.innerHTML = this.cache.colorMaps;
      this.hideMasksLoading();
      return;
    }
    
    this.elements.colorMaps.innerHTML = '';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = secondImg.naturalWidth;
    canvas.height = secondImg.naturalHeight;
    ctx.drawImage(secondImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const paletteRGB = this.app.state.currentPalette.map(hex => Utils.hexToRgb(hex));
    
    paletteRGB.forEach((color, index) => {
      const mapCanvas = document.createElement('canvas');
      const mapCtx = mapCanvas.getContext('2d');
      mapCanvas.width = canvas.width;
      mapCanvas.height = canvas.height;
      const mapImageData = mapCtx.createImageData(canvas.width, canvas.height);
      const mapData = mapImageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const distances = paletteRGB.map(c => Math.sqrt((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2));
        const minIndex = distances.indexOf(Math.min(...distances));
        
        if (minIndex === index) {
          mapData[i] = 0;
          mapData[i + 1] = 0;
          mapData[i + 2] = 0;
          mapData[i + 3] = 255;
        } else {
          mapData[i] = 255;
          mapData[i + 1] = 255;
          mapData[i + 2] = 255;
          mapData[i + 3] = 255;
        }
      }
      
      mapCtx.putImageData(mapImageData, 0, 0);
      
      const mapContainer = document.createElement('div');
      mapContainer.className = 'map-container';
      
      const img = document.createElement('img');
      img.src = mapCanvas.toDataURL();
      img.style.border = `4px solid ${this.app.state.currentPalette[index]}`;
      
      const label = document.createElement('div');
      label.className = 'map-label';
      if (index === 0) {
        label.textContent = 'ФОН';
        label.style.backgroundColor = 'rgba(46,166,255,0.9)';
      } else {
        label.textContent = `ЦВЕТ ${index}`;
      }
      
      mapContainer.appendChild(img);
      mapContainer.appendChild(label);
      this.elements.colorMaps.appendChild(mapContainer);
    });
    
    // Сохраняем в кеш для оптимизации
    this.cache.lastImageSrc = currentImageSrc;
    this.cache.lastPalette = currentPalette;
    this.cache.colorMaps = this.elements.colorMaps.innerHTML;
    
    // Скрываем индикатор загрузки
    this.hideMasksLoading();
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
    
    // Показываем уведомление об успешном определении
    if (this.app.telegramAPI) {
      this.app.telegramAPI.hapticFeedback('light');
    }
  }
  
  reset() {
    // Сброс UI элементов
    this.elements.paletteDiv.innerHTML = '';
    this.elements.colorMaps.innerHTML = '';
    document.getElementById('paletteSection').classList.remove('active');
    
    // Сброс значений
    this.elements.clusteringMethod.value = 'kmeans';
    this.elements.colorCount.value = '3';
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
