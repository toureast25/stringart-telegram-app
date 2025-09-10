/**
 * ActualColors - Модуль для работы с фактическими цветами
 * Отвечает за сопоставление расчётных цветов с реальными материалами
 */

class ActualColors {
  constructor(app) {
    this.app = app;
    
    this.elements = {
      actualColorsSection: document.getElementById('actualColorsSection'),
      addColorBtn: document.getElementById('addColorBtn'),
      actualPaletteDiv: document.getElementById('actualPalette'),
      syncWithCalculated: document.getElementById('syncWithCalculated'),
      autoMatchColors: document.getElementById('autoMatchColors'),
      syncPaletteBtn: document.getElementById('syncPaletteBtn'),
      matchColorsBtn: document.getElementById('matchColorsBtn'),
      mappingList: document.getElementById('mappingList'),
      actualMapsContainer: document.getElementById('actualMapsContainer'),
      usedColorsInfo: document.getElementById('usedColorsInfo')
    };
    
    this.bindEvents();
  }
  
  bindEvents() {
    // Обработчики для работы с фактическими цветами
    this.elements.addColorBtn?.addEventListener('click', () => {
      this.addActualColor();
    });

    this.elements.matchColorsBtn?.addEventListener('click', () => {
      this.matchColors();
    });

    this.elements.syncPaletteBtn?.addEventListener('click', () => {
      this.syncActualWithCalculated();
    });

    this.elements.syncWithCalculated?.addEventListener('change', () => {
      if (this.elements.syncWithCalculated.checked && this.app.state.currentPalette.length > 0) {
        this.syncActualWithCalculated();
      }
    });

    this.elements.autoMatchColors?.addEventListener('change', () => {
      if (this.elements.autoMatchColors.checked && 
          this.app.state.currentPalette.length > 0 && 
          this.app.state.actualPalette.length > 0) {
        this.matchColors();
      }
    });
  }
  
  // Функция для синхронизации фактической палитры с расчётной
  syncActualWithCalculated() {
    if (this.elements.syncWithCalculated.checked && this.app.state.currentPalette.length > 0) {
      const newActualPalette = [...this.app.state.currentPalette];
      this.app.setActualPalette(newActualPalette);
      this.renderActualPalette();
      if (this.elements.autoMatchColors.checked) {
        this.matchColors();
      }
    }
  }

  // Функция для добавления цвета в фактическую палитру
  addActualColor(color = '#ffffff') {
    const newActualPalette = [...this.app.state.actualPalette, color];
    this.app.setActualPalette(newActualPalette);
    this.renderActualPalette();
    if (this.elements.autoMatchColors.checked) {
      this.matchColors();
    }
  }

  // Функция для удаления цвета из фактической палитры
  removeActualColor(index) {
    const newActualPalette = [...this.app.state.actualPalette];
    newActualPalette.splice(index, 1);
    this.app.setActualPalette(newActualPalette);
    this.renderActualPalette();
    if (this.elements.autoMatchColors.checked) {
      this.matchColors();
    }
  }

  // Функция для отображения фактической палитры
  renderActualPalette() {
    // Принудительное обновление для мобильных устройств
    if (this.elements.actualPaletteDiv) {
      this.elements.actualPaletteDiv.innerHTML = '';
      // Принудительный reflow для мобильных браузеров
      this.elements.actualPaletteDiv.offsetHeight;
    }
    
    this.app.state.actualPalette.forEach((color, index) => {
      const item = document.createElement('div');
      item.className = 'color-item actual-color-item';
      
      // Создаем кружок в стиле сопоставления
      const circle = document.createElement('div');
      circle.style.width = '24px';
      circle.style.height = '24px';
      circle.style.borderRadius = '50%';
      circle.style.backgroundColor = color;
      circle.style.border = '2px solid #fff';
      circle.style.cursor = 'pointer';
      circle.style.flexShrink = '0';
      
      // Скрытый input для выбора цвета
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = color;
      colorInput.style.display = 'none';
      
      const code = document.createElement('input');
      code.type = 'text';
      code.value = color;
      code.className = 'color-code';
      code.maxLength = 7;
      
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '×';
      removeBtn.className = 'remove-color-btn';
      removeBtn.title = 'Удалить цвет';
      removeBtn.onclick = () => this.removeActualColor(index);
      
      // События для изменения цвета
      circle.addEventListener('click', () => {
        colorInput.click();
      });
      
      colorInput.addEventListener('input', () => {
        circle.style.backgroundColor = colorInput.value;
        code.value = colorInput.value;
        this.updateActualColor(index, colorInput.value);
      });
      
      code.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(code.value)) {
          circle.style.backgroundColor = code.value;
          colorInput.value = code.value;
          this.updateActualColor(index, code.value);
        }
      });
      
      item.appendChild(circle);
      item.appendChild(code);
      item.appendChild(removeBtn);
      item.appendChild(colorInput); // Добавляем скрытый input
      this.elements.actualPaletteDiv.appendChild(item);
    });
    
    // Принудительное обновление отображения для всех устройств
    if (this.elements.actualPaletteDiv) {
      // Всегда применяем агрессивное обновление для стабильности
      this.elements.actualPaletteDiv.style.display = 'none';
      this.elements.actualPaletteDiv.offsetHeight; // Принудительный reflow
      this.elements.actualPaletteDiv.style.display = '';
      
      // Дополнительное обновление через setTimeout для всех устройств
      setTimeout(() => {
        if (this.elements.actualPaletteDiv) {
          this.elements.actualPaletteDiv.style.transform = 'translateZ(0)';
          this.elements.actualPaletteDiv.offsetHeight;
          this.elements.actualPaletteDiv.style.transform = '';
          
          // Еще один цикл обновления для особо упрямых браузеров
          setTimeout(() => {
            if (this.elements.actualPaletteDiv) {
              this.elements.actualPaletteDiv.classList.add('force-refresh');
              this.elements.actualPaletteDiv.offsetHeight;
              this.elements.actualPaletteDiv.classList.remove('force-refresh');
            }
          }, 100);
        }
      }, 50);
    }
  }
  
  updateActualColor(index, color) {
    const newActualPalette = [...this.app.state.actualPalette];
    newActualPalette[index] = color;
    this.app.setActualPalette(newActualPalette);
    
    if (this.elements.autoMatchColors.checked) {
      this.matchColors();
    }
    
    // Обновляем StringArt предпросмотр
    if (this.app.stringartGenerator) {
      this.app.stringartGenerator.generatePreview();
    }
  }

  // Функция для сопоставления расчётных цветов с фактическими
  matchColors() {
    if (this.app.state.currentPalette.length === 0 || this.app.state.actualPalette.length === 0) {
      this.app.setColorMapping([]);
      this.renderColorMapping();
      this.generateActualColorMaps();
      return;
    }
    
    const colorMapping = [];
    
    // Для каждого расчётного цвета находим ближайший фактический
    this.app.state.currentPalette.forEach((calculatedColor, index) => {
      const calculatedRGB = Utils.hexToRgb(calculatedColor);
      const calculatedLAB = Utils.rgbToLab(calculatedRGB[0], calculatedRGB[1], calculatedRGB[2]);
      
      let bestMatch = null;
      let bestDistance = Infinity;
      
      this.app.state.actualPalette.forEach((actualColor, actualIndex) => {
        const actualRGB = Utils.hexToRgb(actualColor);
        const actualLAB = Utils.rgbToLab(actualRGB[0], actualRGB[1], actualRGB[2]);
        const distance = Utils.deltaE(calculatedLAB, actualLAB);
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = {
            actualColor: actualColor,
            actualIndex: actualIndex,
            distance: distance
          };
        }
      });
      
      colorMapping.push({
        calculatedColor: calculatedColor,
        calculatedIndex: index,
        actualColor: bestMatch.actualColor,
        actualIndex: bestMatch.actualIndex,
        distance: bestMatch.distance
      });
    });
    
    this.app.setColorMapping(colorMapping);
    this.renderColorMapping();
    this.generateActualColorMaps();
    
    // Обновляем StringArt предпросмотр
    if (this.app.stringartGenerator) {
      this.app.stringartGenerator.generatePreview();
    }
  }

  // Функция для отображения сопоставления цветов
  renderColorMapping() {
    this.elements.mappingList.innerHTML = '';
    
    if (this.app.state.colorMapping.length === 0) {
      this.elements.mappingList.innerHTML = '<p style="color:var(--muted);margin:0;">Нет данных для сопоставления</p>';
      return;
    }
    
    this.app.state.colorMapping.forEach((mapping, index) => {
      const item = document.createElement('div');
      item.className = 'mapping-item';
      
      const colorsDiv = document.createElement('div');
      colorsDiv.className = 'mapping-colors';
      
      // Расчётный цвет
      const calculatedDiv = document.createElement('div');
      calculatedDiv.style.display = 'flex';
      calculatedDiv.style.alignItems = 'center';
      calculatedDiv.style.gap = '8px';
      
      const calculatedCircle = document.createElement('div');
      calculatedCircle.style.width = '24px';
      calculatedCircle.style.height = '24px';
      calculatedCircle.style.borderRadius = '50%';
      calculatedCircle.style.backgroundColor = mapping.calculatedColor;
      calculatedCircle.style.border = '2px solid #fff';
      calculatedCircle.style.flexShrink = '0';
      
      const calculatedLabel = document.createElement('span');
      calculatedLabel.textContent = `Расчётный ${index + 1}`;
      calculatedLabel.style.fontSize = '12px';
      
      calculatedDiv.appendChild(calculatedCircle);
      calculatedDiv.appendChild(calculatedLabel);
      
      // Стрелка
      const arrow = document.createElement('span');
      arrow.className = 'mapping-arrow';
      arrow.textContent = '→';
      
      // Фактический цвет
      const actualDiv = document.createElement('div');
      actualDiv.style.display = 'flex';
      actualDiv.style.alignItems = 'center';
      actualDiv.style.gap = '8px';
      
      const actualCircle = document.createElement('div');
      actualCircle.style.width = '24px';
      actualCircle.style.height = '24px';
      actualCircle.style.borderRadius = '50%';
      actualCircle.style.backgroundColor = mapping.actualColor;
      actualCircle.style.border = '2px solid #fff';
      actualCircle.style.flexShrink = '0';
      
      const actualLabel = document.createElement('span');
      actualLabel.textContent = `Фактический ${mapping.actualIndex + 1}`;
      actualLabel.style.fontSize = '12px';
      
      actualDiv.appendChild(actualCircle);
      actualDiv.appendChild(actualLabel);
      
      // Расстояние
      const distanceLabel = document.createElement('span');
      distanceLabel.textContent = `ΔE: ${mapping.distance.toFixed(1)}`;
      distanceLabel.style.fontSize = '11px';
      distanceLabel.style.color = 'var(--muted)';
      
      colorsDiv.appendChild(calculatedDiv);
      colorsDiv.appendChild(arrow);
      colorsDiv.appendChild(actualDiv);
      colorsDiv.appendChild(distanceLabel);
      
      item.appendChild(colorsDiv);
      this.elements.mappingList.appendChild(item);
    });
  }

  // Функция для генерации масок с фактическими цветами
  generateActualColorMaps() {
    this.elements.actualMapsContainer.innerHTML = '';
    
    const secondImg = document.getElementById('secondImg');
    if (!secondImg.src || this.app.state.colorMapping.length === 0) {
      this.elements.usedColorsInfo.textContent = '';
      return;
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = secondImg.naturalWidth;
    canvas.height = secondImg.naturalHeight;
    ctx.drawImage(secondImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Переводим цвета палитры из HEX в RGB
    const calculatedRGB = this.app.state.currentPalette.map(hex => Utils.hexToRgb(hex));
    
    // Получаем уникальные индексы фактических цветов, которые используются в сопоставлении
    const usedActualIndices = [...new Set(this.app.state.colorMapping.map(m => m.actualIndex))];
    
    // Обновляем информацию об использованных цветах
    this.elements.usedColorsInfo.textContent = `(используется ${usedActualIndices.length} из ${this.app.state.actualPalette.length} цветов)`;
    
    // Создаём маски только для фактических цветов, которые используются в сопоставлении
    usedActualIndices.forEach(actualIndex => {
      const actualColor = this.app.state.actualPalette[actualIndex];
      const mapCanvas = document.createElement('canvas');
      const mapCtx = mapCanvas.getContext('2d');
      mapCanvas.width = canvas.width;
      mapCanvas.height = canvas.height;
      const mapImageData = mapCtx.createImageData(canvas.width, canvas.height);
      const mapData = mapImageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        
        // Находим ближайший расчётный цвет
        const distances = calculatedRGB.map(c => Math.sqrt((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2));
        const minIndex = distances.indexOf(Math.min(...distances));
        
        // Проверяем, сопоставлен ли этот расчётный цвет с текущим фактическим
        const mapping = this.app.state.colorMapping.find(m => m.calculatedIndex === minIndex);
        if (mapping && mapping.actualIndex === actualIndex) {
          mapData[i] = 0;     // Чёрный пиксель
          mapData[i + 1] = 0;
          mapData[i + 2] = 0;
          mapData[i + 3] = 255;
        } else {
          mapData[i] = 255;   // Белый пиксель
          mapData[i + 1] = 255;
          mapData[i + 2] = 255;
          mapData[i + 3] = 255;
        }
      }
      
      mapCtx.putImageData(mapImageData, 0, 0);
      
      const img = document.createElement('img');
      img.src = mapCanvas.toDataURL();
      img.style.border = `4px solid ${actualColor}`;
      this.elements.actualMapsContainer.appendChild(img);
    });
  }
  
  reset() {
    // Сброс UI элементов
    this.elements.actualColorsSection.classList.remove('active');
    this.elements.actualMapsContainer.innerHTML = '';
    this.elements.mappingList.innerHTML = '';
    this.elements.usedColorsInfo.textContent = '';
    this.renderActualPalette();
  }
  
  onStateChange(state) {
    // Реагируем на изменения состояния приложения
    if (state.actualPalette !== this.lastActualPalette) {
      this.lastActualPalette = state.actualPalette;
      this.renderActualPalette();
      
      // Дополнительный принудительный вызов для упрямых браузеров
      setTimeout(() => {
        this.renderActualPalette();
      }, 200);
    }
    
    if (state.colorMapping !== this.lastColorMapping) {
      this.lastColorMapping = state.colorMapping;
      this.renderColorMapping();
      this.generateActualColorMaps();
    }
    
    // Синхронизируем фактическую палитру с расчётной, если включена соответствующая галочка
    if (state.currentPalette !== this.lastCalculatedPalette) {
      this.lastCalculatedPalette = state.currentPalette;
      
      if (this.elements.syncWithCalculated.checked && state.currentPalette.length > 0) {
        this.syncActualWithCalculated();
      } else if (state.actualPalette.length > 0) {
        // Принудительно обновляем маски, даже если синхронизация выключена
        this.matchColors();
      }
    }
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActualColors;
}
