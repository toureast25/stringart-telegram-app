/**
 * StringArtGenerator - Модуль для генерации схем StringArt
 * Отвечает за создание схем полотна, расчет положения гвоздей и наложение масок
 */

class StringArtGenerator {
  constructor(app) {
    this.app = app;
    
    this.elements = {
      stringartSection: document.getElementById('stringartSection'),
      canvasShape: document.getElementById('canvasShape'),
      canvasSize: document.getElementById('canvasSize'),
      nailCount: document.getElementById('nailCount'),
      stringartCanvas: document.getElementById('stringartCanvas'),
      stringartInfo: document.getElementById('stringartInfo')
    };
    
    this.bindEvents();
  }
  
  bindEvents() {
    // Обработчики для настроек StringArt
    this.elements.canvasShape?.addEventListener('change', () => {
      this.generatePreview();
    });
    
    this.elements.canvasSize?.addEventListener('change', () => {
      this.generatePreview();
    });
    
    this.elements.nailCount?.addEventListener('input', () => {
      this.generatePreview();
    });
  }
  
  generatePreview() {
    const shape = this.elements.canvasShape.value;
    const size = parseInt(this.elements.canvasSize.value);
    const nails = parseInt(this.elements.nailCount.value);
    
    // Вычисляем пропорциональные размеры canvas на основе исходного изображения
    const maxSize = 310; // максимальный размер в пикселях
    const aspectRatio = this.app.state.originalHeight / this.app.state.originalWidth;
    
    let canvasWidth, canvasHeight;
    if (aspectRatio > 1) {
      // Изображение выше чем шире (портрет)
      canvasHeight = maxSize;
      canvasWidth = Math.round(maxSize / aspectRatio);
    } else {
      // Изображение шире чем выше (пейзаж) или квадрат
      canvasWidth = maxSize;
      canvasHeight = Math.round(maxSize * aspectRatio);
    }
    
    // Настройка canvas
    this.elements.stringartCanvas.width = canvasWidth;
    this.elements.stringartCanvas.height = canvasHeight;
    const ctx = this.elements.stringartCanvas.getContext('2d');
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Центр canvas
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Радиус для отображения изображения (адаптируется к размеру canvas)
    const imageRadius = Math.min(canvasWidth, canvasHeight) / 2 - 10; // отступ 10px от краев
    
    // Радиус для отображения полотна (пропорционально размеру canvas)
    const canvasRadius = Math.min(canvasWidth, canvasHeight) / 2;
    
    // Рисуем фон полотна (больший размер)
    ctx.fillStyle = '#e0e0e0';
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, canvasRadius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      const canvasSize = canvasRadius * 2;
      ctx.fillRect(centerX - canvasSize/2, centerY - canvasSize/2, canvasSize, canvasSize);
    }
    
    // Рисуем область изображения (меньший размер)
    ctx.fillStyle = '#cccccc';
    if (shape === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, centerY, imageRadius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      const imageSize = imageRadius * 2;
      ctx.fillRect(centerX - imageSize/2, centerY - imageSize/2, imageSize, imageSize);
    }
    
    // Рисуем гвозди
    this.drawNails(ctx, centerX, centerY, imageRadius, shape, nails);
    
    // Накладываем цветовые маски, если они есть
    if (this.app.state.colorMapping.length > 0) {
      this.overlayColorMasks(ctx, centerX, centerY, imageRadius, shape);
    }
    
    // Обновляем информацию
    this.updateInfo(size, nails, shape);
  }
  
  drawNails(ctx, centerX, centerY, radius, shape, nailCount) {
    ctx.fillStyle = '#000000';
    const nailRadius = 1.5; // Размер гвоздиков
    
    for (let i = 0; i < nailCount; i++) {
      const angle = (i / nailCount) * 2 * Math.PI;
      let nailX, nailY;
      
      if (shape === 'circle') {
        // Гвозди по периметру круга
        nailX = centerX + Math.cos(angle) * radius;
        nailY = centerY + Math.sin(angle) * radius;
      } else {
        // Для квадрата распределяем гвозди по периметру
        const sideLength = radius * 2;
        const perimeter = sideLength * 4;
        const position = (i / nailCount) * perimeter;
        
        if (position < sideLength) {
          // Верхняя сторона (слева направо)
          nailX = centerX - radius + position;
          nailY = centerY - radius;
        } else if (position < 2 * sideLength) {
          // Правая сторона (сверху вниз)
          nailX = centerX + radius;
          nailY = centerY - radius + (position - sideLength);
        } else if (position < 3 * sideLength) {
          // Нижняя сторона (справа налево)
          nailX = centerX + radius - (position - 2 * sideLength);
          nailY = centerY + radius;
        } else {
          // Левая сторона (снизу вверх)
          nailX = centerX - radius;
          nailY = centerY + radius - (position - 3 * sideLength);
        }
      }
      
      ctx.beginPath();
      ctx.arc(nailX, nailY, nailRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  
  overlayColorMasks(ctx, centerX, centerY, imageRadius, shape) {
    const secondImg = document.getElementById('secondImg');
    if (!secondImg.src || this.app.state.colorMapping.length === 0) return;
    
    // Создаём временный canvas для обработки изображения
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = secondImg.naturalWidth;
    tempCanvas.height = secondImg.naturalHeight;
    
    // Рисуем исходное изображение
    tempCtx.drawImage(secondImg, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Переводим цвета палитры из HEX в RGB
    const calculatedRGB = this.app.state.currentPalette.map(hex => Utils.hexToRgb(hex));
    
    // Размер области изображения в схеме
    const schemeImageSize = imageRadius * 2;
    
    // Создаём маску для каждой фактической палитры
    const usedActualIndices = [...new Set(this.app.state.colorMapping.map(m => m.actualIndex))];
    
    usedActualIndices.forEach(actualIndex => {
      const actualColor = this.app.state.actualPalette[actualIndex];
      const actualRGB = Utils.hexToRgb(actualColor);
      
      // Создаём маску для этого цвета
      const maskCanvas = document.createElement('canvas');
      const maskCtx = maskCanvas.getContext('2d');
      maskCanvas.width = tempCanvas.width;
      maskCanvas.height = tempCanvas.height;
      const maskImageData = maskCtx.createImageData(tempCanvas.width, tempCanvas.height);
      const maskData = maskImageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        
        // Находим ближайший расчётный цвет
        const distances = calculatedRGB.map(c => 
          Math.sqrt((r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2)
        );
        const minIndex = distances.indexOf(Math.min(...distances));
        
        // Проверяем, сопоставлен ли этот расчётный цвет с текущим фактическим
        const mapping = this.app.state.colorMapping.find(m => m.calculatedIndex === minIndex);
        if (mapping && mapping.actualIndex === actualIndex) {
          // Этот пиксель должен быть окрашен в фактический цвет
          maskData[i] = actualRGB[0];
          maskData[i + 1] = actualRGB[1];
          maskData[i + 2] = actualRGB[2];
          maskData[i + 3] = 180; // Полупрозрачность
        } else {
          maskData[i + 3] = 0; // Прозрачный
        }
      }
      
      maskCtx.putImageData(maskImageData, 0, 0);
      
      // Накладываем маску на схему
      ctx.save();
      
      // Создаём обрезку по форме
      if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, imageRadius, 0, 2 * Math.PI);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(centerX - imageRadius, centerY - imageRadius, schemeImageSize, schemeImageSize);
        ctx.clip();
      }
      
      // Рисуем маску с масштабированием
      ctx.drawImage(maskCanvas, centerX - imageRadius, centerY - imageRadius, schemeImageSize, schemeImageSize);
      
      ctx.restore();
    });
  }
  
  updateInfo(size, nails, shape) {
    const imageSize = size; // Размер изображения
    const actualSize = size + 1; // Фактический размер полотна с учётом отступа гвоздей
    const perimeter = shape === 'circle' ? Math.PI * imageSize : 4 * imageSize; // Периметр изображения
    const nailDistance = perimeter / nails;
    
    this.elements.stringartInfo.textContent = 
      `Размер изображения: ${imageSize} см | Размер полотна: ${actualSize} см | Гвоздей: ${nails} | Расстояние между гвоздями: ~${nailDistance.toFixed(2)} см`;
  }
  
  // Метод для экспорта схемы как изображение
  exportScheme() {
    const canvas = this.elements.stringartCanvas;
    return canvas.toDataURL('image/png');
  }
  
  // Метод для получения координат гвоздей
  getNailCoordinates() {
    const shape = this.elements.canvasShape.value;
    const nails = parseInt(this.elements.nailCount.value);
    const size = parseInt(this.elements.canvasSize.value);
    
    const coordinates = [];
    const radius = size / 2; // Радиус в см
    
    for (let i = 0; i < nails; i++) {
      const angle = (i / nails) * 2 * Math.PI;
      let x, y;
      
      if (shape === 'circle') {
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
      } else {
        // Для квадрата
        const sideLength = size;
        const perimeter = sideLength * 4;
        const position = (i / nails) * perimeter;
        
        if (position < sideLength) {
          x = -radius + position;
          y = -radius;
        } else if (position < 2 * sideLength) {
          x = radius;
          y = -radius + (position - sideLength);
        } else if (position < 3 * sideLength) {
          x = radius - (position - 2 * sideLength);
          y = radius;
        } else {
          x = -radius;
          y = radius - (position - 3 * sideLength);
        }
      }
      
      coordinates.push({ 
        index: i, 
        x: Utils.formatNumber(x, 2), 
        y: Utils.formatNumber(y, 2) 
      });
    }
    
    return coordinates;
  }
  
  // Метод для получения данных о цветовых зонах
  getColorZones() {
    if (this.app.state.colorMapping.length === 0) {
      return [];
    }
    
    const zones = [];
    const usedActualIndices = [...new Set(this.app.state.colorMapping.map(m => m.actualIndex))];
    
    usedActualIndices.forEach(actualIndex => {
      const actualColor = this.app.state.actualPalette[actualIndex];
      const mapping = this.app.state.colorMapping.find(m => m.actualIndex === actualIndex);
      
      zones.push({
        actualColorIndex: actualIndex,
        actualColor: actualColor,
        calculatedColor: mapping.calculatedColor,
        calculatedIndex: mapping.calculatedIndex,
        distance: mapping.distance
      });
    });
    
    return zones;
  }
  
  // Метод для экспорта полных данных проекта
  exportProjectData() {
    return {
      settings: {
        shape: this.elements.canvasShape.value,
        size: parseInt(this.elements.canvasSize.value),
        nailCount: parseInt(this.elements.nailCount.value)
      },
      nailCoordinates: this.getNailCoordinates(),
      colorZones: this.getColorZones(),
      palette: {
        calculated: this.app.state.currentPalette,
        actual: this.app.state.actualPalette,
        mapping: this.app.state.colorMapping
      },
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        generator: 'StringArt Telegram Mini App'
      }
    };
  }
  
  reset() {
    // Сброс UI элементов
    this.elements.stringartSection.classList.remove('active');
    
    // Очистка canvas
    const ctx = this.elements.stringartCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.elements.stringartCanvas.width, this.elements.stringartCanvas.height);
    
    // Сброс значений
    this.elements.canvasShape.value = 'circle';
    this.elements.canvasSize.value = '30';
    this.elements.nailCount.value = '200';
    this.elements.stringartInfo.textContent = 'Размер: 30 см | Гвоздей: 200 | Расстояние между гвоздями: ~0.47 см';
  }
  
  onStateChange(state) {
    // Реагируем на изменения состояния приложения
    if (state.colorMapping !== this.lastColorMapping) {
      this.lastColorMapping = state.colorMapping;
      if (this.elements.stringartSection.classList.contains('active')) {
        this.generatePreview();
      }
    }
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StringArtGenerator;
}
