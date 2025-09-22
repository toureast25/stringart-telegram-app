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
    // Детекция мобильных устройств
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                    window.Telegram?.WebApp?.platform ||
                    ('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0);
    
    // Принудительное обновление для мобильных устройств
    if (this.elements.actualPaletteDiv) {
      this.elements.actualPaletteDiv.innerHTML = '';
      
      // Очищаем старые скрытые color input из body
      const oldColorInputs = document.querySelectorAll('input[type="color"][style*="display: none"]');
      oldColorInputs.forEach(input => {
        if (input.parentNode === document.body) {
          document.body.removeChild(input);
        }
      });
      
      if (isMobile) {
        // Экстремальные меры для мобильных
        this.elements.actualPaletteDiv.style.visibility = 'hidden';
        this.elements.actualPaletteDiv.style.display = 'none';
        this.elements.actualPaletteDiv.offsetHeight;
        this.elements.actualPaletteDiv.style.display = '';
        this.elements.actualPaletteDiv.style.visibility = 'visible';
        
        // Принудительное перерисовывание всей секции
        const parentSection = this.elements.actualPaletteDiv.closest('.second-preview');
        if (parentSection) {
          parentSection.style.transform = 'translateZ(0)';
          parentSection.offsetHeight;
        }
      } else {
        // Обычный reflow для десктопа
        this.elements.actualPaletteDiv.offsetHeight;
      }
    }
    
    this.app.state.actualPalette.forEach((color, index) => {
      const item = document.createElement('div');
      item.className = 'color-item actual-color-item';
      
      // Детекция Telegram WebApp
      const isTelegram = window.Telegram?.WebApp?.platform;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
      
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
      
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '×';
      removeBtn.className = 'remove-color-btn';
      removeBtn.title = 'Удалить цвет';
      removeBtn.onclick = () => this.removeActualColor(index);
      
      // События для изменения цвета — открываем единый RGB-редактор
      circle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.app.colorAnalyzer) {
          this.app.colorAnalyzer.openColorEditor(color, (selectedColor) => {
            if (selectedColor) {
              circle.style.backgroundColor = selectedColor;
              code.value = selectedColor;
              this.updateActualColor(index, selectedColor);
            }
          });
        }
      });
      
      // Общий обработчик для текстового поля
      code.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(code.value)) {
          circle.style.backgroundColor = code.value;
          if (colorInput) {
            colorInput.value = code.value;
          }
          this.updateActualColor(index, code.value);
        }
      });
      
      item.appendChild(circle);
      item.appendChild(code);
      item.appendChild(removeBtn);
      // Добавляем скрытый input в body только если он существует
      if (colorInput) {
        document.body.appendChild(colorInput);
      }
      this.elements.actualPaletteDiv.appendChild(item);
    });
    
    // Принудительное обновление отображения с мобильными хаками
    if (this.elements.actualPaletteDiv) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      window.Telegram?.WebApp?.platform ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
      
      if (isMobile) {
        // ЭКСТРЕМАЛЬНЫЕ меры для мобильных браузеров
        
        // Шаг 1: Полное скрытие и принудительный reflow
        this.elements.actualPaletteDiv.style.visibility = 'hidden';
        this.elements.actualPaletteDiv.style.display = 'none';
        this.elements.actualPaletteDiv.offsetHeight;
        
        // Шаг 2: Восстановление с задержкой
        setTimeout(() => {
          if (this.elements.actualPaletteDiv) {
            this.elements.actualPaletteDiv.style.display = '';
            this.elements.actualPaletteDiv.style.visibility = 'visible';
            this.elements.actualPaletteDiv.offsetHeight;
            
            // Шаг 3: Transform хаки
            this.elements.actualPaletteDiv.style.transform = 'translateZ(0) scale(1)';
            this.elements.actualPaletteDiv.offsetHeight;
            this.elements.actualPaletteDiv.style.transform = '';
            
            // Шаг 4: Принудительное перерисовывание родителя
            const parent = this.elements.actualPaletteDiv.parentElement;
            if (parent) {
              parent.style.transform = 'translateZ(0)';
              parent.offsetHeight;
              parent.style.transform = '';
            }
            
            // Шаг 5: Финальный CSS класс
            setTimeout(() => {
              if (this.elements.actualPaletteDiv) {
                this.elements.actualPaletteDiv.classList.add('force-refresh');
                this.elements.actualPaletteDiv.offsetHeight;
                this.elements.actualPaletteDiv.classList.remove('force-refresh');
                
                // Шаг 6: Telegram-specific хак
                if (window.Telegram?.WebApp) {
                  window.Telegram.WebApp.expand();
                  setTimeout(() => {
                    if (this.elements.actualPaletteDiv) {
                      this.elements.actualPaletteDiv.style.opacity = '0.99';
                      this.elements.actualPaletteDiv.offsetHeight;
                      this.elements.actualPaletteDiv.style.opacity = '';
                    }
                  }, 50);
                }
              }
            }, 100);
          }
        }, 50);
      } else {
        // Обычное обновление для десктопа
        this.elements.actualPaletteDiv.style.display = 'none';
        this.elements.actualPaletteDiv.offsetHeight;
        this.elements.actualPaletteDiv.style.display = '';
      }
    }
  }
  
  // Метод для выбора цвета через палитру
  showTelegramColorPicker(index, currentColor, circle, code) {
    // Используем общий метод из colorAnalyzer
    if (this.app.colorAnalyzer) {
      this.app.colorAnalyzer.showColorPalette((selectedColor) => {
        if (selectedColor) {
          circle.style.backgroundColor = selectedColor;
          code.value = selectedColor;
          this.updateActualColor(index, selectedColor);
          
        }
      });
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
    if (this.app.stringartPreview) {
      this.app.stringartPreview.generatePreview();
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
      const calculatedRGB = this.app.colorAnalyzer.colorUtils.hexToRgb(calculatedColor);
      const calculatedLAB = this.app.colorAnalyzer.colorUtils.rgbToLab(calculatedRGB[0], calculatedRGB[1], calculatedRGB[2]);
      
      let bestMatch = null;
      let bestDistance = Infinity;
      
      this.app.state.actualPalette.forEach((actualColor, actualIndex) => {
        const actualRGB = this.app.colorAnalyzer.colorUtils.hexToRgb(actualColor);
        const actualLAB = this.app.colorAnalyzer.colorUtils.rgbToLab(actualRGB[0], actualRGB[1], actualRGB[2]);
        const distance = this.app.colorAnalyzer.colorUtils.deltaE(calculatedLAB, actualLAB);
        
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
    if (this.app.stringartPreview) {
      this.app.stringartPreview.generatePreview();
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
    if (!this.app.mapGenerator) {
      console.warn('MapGenerator не инициализирован');
      return;
    }

    // Обновляем информацию об использованных цветах
    const stats = this.app.mapGenerator.getColorUsageStats(this.app.state.colorMapping);
    this.elements.usedColorsInfo.textContent = `(используется ${stats.used} из ${stats.total} цветов)`;

    // Используем централизованный MapGenerator
    this.app.mapGenerator.generateColorMaps(
      this.app.state.currentPalette,
      'actualMapsContainer',
      {
        showLabels: false,
        borderWidth: '4px',
        useCache: true,
        showLoading: false
      },
      this.app.state.colorMapping
    );
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
      
      // Мобильная детекция для дополнительных вызовов
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                      window.Telegram?.WebApp?.platform ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
      
      if (isMobile) {
        // Тройной вызов для мобильных с увеличенными задержками
        setTimeout(() => {
          this.renderActualPalette();
        }, 300);
        
        setTimeout(() => {
          this.renderActualPalette();
        }, 600);
        
        // Финальный вызов для Telegram
        if (window.Telegram?.WebApp) {
          setTimeout(() => {
            this.renderActualPalette();
          }, 1000);
        }
      } else {
        // Обычный дополнительный вызов для десктопа
        setTimeout(() => {
          this.renderActualPalette();
        }, 200);
      }
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
