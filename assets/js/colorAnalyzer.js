/**
 * ColorAnalyzer - Модуль для анализа цветов и кластеризации
 * Отвечает за извлечение палитры, k-means кластеризацию и работу с цветами
 */

class ColorAnalyzer {
  constructor(app) {
    this.app = app;
    
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
    // Обработчики для метода кластеризации
    this.elements.clusteringMethod?.addEventListener('change', () => {
      this.updateMethodInterface();
      this.extractPalette();
    });
    
    // Обработчики для количества цветов
    this.elements.colorCount?.addEventListener('change', () => {
      if (this.elements.clusteringMethod.value === 'tones') {
        this.updateTonesProportions();
      }
      this.extractPalette();
    });
    
    // Обработчики для метода по тонам
    this.elements.minDeltaEInput?.addEventListener('input', () => this.extractPalette());
    this.elements.darkCount?.addEventListener('input', () => this.handleTonesCountChange());
    this.elements.midCount?.addEventListener('input', () => this.handleTonesCountChange());
    this.elements.lightCount?.addEventListener('input', () => this.handleTonesCountChange());
    
    // Обработчики для настроек фона
    this.elements.bgColorPicker?.addEventListener('input', (e) => {
      this.setBackgroundColorAndUpdate(e.target.value);
    });
    
    this.elements.bgEdgePercent?.addEventListener('input', () => {
      this.recalculateBackgroundColor();
    });
    
    this.elements.bgEdgePercent?.addEventListener('change', () => {
      this.recalculateBackgroundColor();
    });
    
    // Обработчик для кнопки автоматического определения фона
    this.elements.autoDetectBgBtn?.addEventListener('click', () => {
      this.autoDetectBackground();
    });
    
    // Обработчики для предустановленных цветов фона
    this.elements.backgroundSettings?.querySelectorAll('.color-circle').forEach(btn => {
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
    
    // Реактивное обновление палитры и карт при изменении фона
    if (this.app.state.currentPalette.length > 0) {
      // Обновляем первый элемент палитры (фон)
      const newPalette = [...this.app.state.currentPalette];
      newPalette[0] = color;
      this.app.setPalette(newPalette);
      
      // Пересчитываем карты глубины
      this.generateColorMaps();
      
      // Обновляем сопоставление с фактической палитрой
      if (this.app.actualColors && this.elements.syncWithCalculated && this.elements.syncWithCalculated.checked) {
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
  
  extractPalette() {
    const secondImg = document.getElementById('secondImg');
    if (!secondImg.src) {
      console.warn('extractPalette: no image source');
      return;
    }
    
    // Проверяем, что изображение загружено
    if (!secondImg.complete || !secondImg.naturalWidth) {
      console.warn('extractPalette: image not ready, retrying...');
      setTimeout(() => this.extractPalette(), 50);
      return;
    }
    
    // Дополнительная проверка для мобильных устройств
    if (this.isMobileDevice() && secondImg.naturalWidth === 0) {
      console.warn('extractPalette: mobile device, image dimensions not ready, retrying...');
      setTimeout(() => this.extractPalette(), 100);
      return;
    }
    
    console.log('extractPalette: analyzing image', secondImg.naturalWidth + 'x' + secondImg.naturalHeight);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = secondImg.naturalWidth;
    canvas.height = secondImg.naturalHeight;
    ctx.drawImage(secondImg, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    // Собираем цвета из изображения (каждый 4-й пиксель для производительности)
    let sampleColors = [];
    for (let i = 0; i < data.length; i += 4 * 4) {
      sampleColors.push([data[i], data[i + 1], data[i + 2]]);
    }
    
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
    
    console.log('extractPalette: completed, palette updated with', palette.length, 'colors');
    console.log('extractPalette: generated', resultColors.length, 'result colors from', sampleColors.length, 'samples');
    
    // Специальная обработка для Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      console.log('Telegram WebApp: triggering haptic feedback after palette update');
      try {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      } catch (e) {
        console.log('Telegram WebApp: haptic feedback not available');
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
    
    this.app.state.currentPalette.forEach((color, idx) => {
      if (idx === 0) return; // Пропускаем фон
      
      const item = document.createElement('div');
      item.className = 'color-item';
      
      const circle = document.createElement('input');
      circle.type = 'color';
      circle.value = color;
      circle.className = 'color-circle';
      
      const code = document.createElement('input');
      code.type = 'text';
      code.value = color;
      code.className = 'color-code';
      code.maxLength = 7;
      
      const pipBtn = document.createElement('button');
      pipBtn.innerHTML = '🖌️';
      pipBtn.title = 'Выбрать цвет с изображения';
      pipBtn.className = 'pipette-btn';
      pipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openPipette(idx);
      });
      
      // События для изменения цвета
      circle.addEventListener('input', () => {
        code.value = circle.value;
        this.updatePaletteColor(idx, circle.value);
      });
      
      code.addEventListener('input', () => {
        circle.value = code.value;
        this.updatePaletteColor(idx, code.value);
      });
      
      const controls = document.createElement('div');
      controls.className = 'color-controls';
      controls.appendChild(code);
      controls.appendChild(pipBtn);
      
      item.appendChild(circle);
      item.appendChild(controls);
      this.elements.paletteDiv.appendChild(item);
    });
  }
  
  updatePaletteColor(index, color) {
    const newPalette = [...this.app.state.currentPalette];
    newPalette[index] = color;
    this.app.setPalette(newPalette);
    this.generateColorMaps();
    
    // Обновляем сопоставление с фактической палитрой
    if (this.app.actualColors && this.elements.syncWithCalculated && this.elements.syncWithCalculated.checked) {
      this.app.actualColors.syncActualWithCalculated();
    } else if (this.app.actualColors && this.elements.autoMatchColors && this.elements.autoMatchColors.checked) {
      this.app.actualColors.matchColors();
    }
  }
  
  generateColorMaps() {
    this.elements.colorMaps.innerHTML = '';
    
    const secondImg = document.getElementById('secondImg');
    if (!secondImg.src || this.app.state.currentPalette.length === 0) return;
    
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
        if (this.app.actualColors && this.elements.syncWithCalculated && this.elements.syncWithCalculated.checked) {
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
    this.elements.clusteringMethod.value = 'tones';
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
    if (this.elements.currentBgColor) {
      this.elements.currentBgColor.textContent = color;
      this.elements.currentBgColor.style.background = color;
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
