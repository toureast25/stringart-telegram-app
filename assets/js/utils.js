/**
 * Utils - Вспомогательные функции
 * Содержит общие утилиты для работы с цветами, математикой и DOM
 */

class Utils {
  // Конвертация RGB в LAB цветовое пространство
  static rgbToLab(r, g, b) {
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
  }
  
  // Вычисление различия между цветами в LAB пространстве (Delta E)
  static deltaE(lab1, lab2) {
    return Math.sqrt(
      (lab1[0] - lab2[0]) ** 2 + 
      (lab1[1] - lab2[1]) ** 2 + 
      (lab1[2] - lab2[2]) ** 2
    );
  }
  
  // Конвертация RGB в HEX
  static rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => 
      x.toString(16).padStart(2, '0')
    ).join('');
  }
  
  // Конвертация HEX в RGB
  static hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [
      (bigint >> 16) & 255,
      (bigint >> 8) & 255,
      bigint & 255
    ];
  }
  
  // Получение среднего цвета по краям изображения
  static getAverageEdgeColor(img, edgePercent = 10) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h).data;
    
    let r = 0, g = 0, b = 0, count = 0;
    
    const percent = Math.max(1, Math.min(100, edgePercent));
    const edgeY = Math.max(1, Math.round(h * percent / 100));
    const edgeX = Math.max(1, Math.round(w * percent / 100));
    
    // Верхняя полоса
    for (let y = 0; y < edgeY; y++) {
      for (let x = 0; x < w; x++) {
        let i = (y * w + x) * 4;
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
        count++;
      }
    }
    
    // Нижняя полоса
    for (let y = h - edgeY; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let i = (y * w + x) * 4;
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
        count++;
      }
    }
    
    // Левая и правая полосы (без углов)
    for (let x = 0; x < edgeX; x++) {
      for (let y = edgeY; y < h - edgeY; y++) {
        let iLeft = (y * w + x) * 4;
        let iRight = (y * w + (w - 1 - x)) * 4;
        
        r += imageData[iLeft] + imageData[iRight];
        g += imageData[iLeft + 1] + imageData[iRight + 1];
        b += imageData[iLeft + 2] + imageData[iRight + 2];
        count += 2;
      }
    }
    
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    
    return this.rgbToHex(r, g, b);
  }
  
  // Ограничение значения в диапазоне
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  
  // Линейная интерполяция
  static lerp(start, end, factor) {
    return start + (end - start) * factor;
  }
  
  // Преобразование градусов в радианы
  static degToRad(degrees) {
    return degrees * (Math.PI / 180);
  }
  
  // Преобразование радианов в градусы
  static radToDeg(radians) {
    return radians * (180 / Math.PI);
  }
  
  // Получение расстояния между двумя точками
  static distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  
  // Создание элемента с классами и атрибутами
  static createElement(tag, className = '', attributes = {}) {
    const element = document.createElement(tag);
    
    if (className) {
      element.className = className;
    }
    
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    return element;
  }
  
  // Форматирование числа с определенным количеством знаков после запятой
  static formatNumber(number, decimals = 2) {
    return Number(number).toFixed(decimals);
  }
  
  // Проверка поддержки браузером определенной возможности
  static isSupported(feature) {
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
  }
  
  // Загрузка изображения с Promise
  static loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  
  // Создание canvas из изображения
  static imageToCanvas(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return canvas;
  }
  
  // Получение данных пикселей из canvas
  static getPixelData(canvas) {
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  
  // Применение фильтра к canvas
  static applyCanvasFilter(canvas, filter) {
    const ctx = canvas.getContext('2d');
    const originalFilter = ctx.filter;
    ctx.filter = filter;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = originalFilter;
    return canvas;
  }
  
  // Дебаунс функции
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Троттлинг функции
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // Генерация уникального ID
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // Проверка мобильного устройства
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  // Копирование текста в буфер обмена
  static async copyToClipboard(text) {
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
  }
  
  // Форматирование размера файла
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  // Получение среднего цвета края изображения
  static getAverageEdgeColor(img, edgePercent = 10) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const edgePixels = Math.floor(Math.min(canvas.width, canvas.height) * edgePercent / 100);
    
    let r = 0, g = 0, b = 0, count = 0;
    
    // Собираем пиксели с краев изображения
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const isEdge = x < edgePixels || x >= canvas.width - edgePixels || 
                      y < edgePixels || y >= canvas.height - edgePixels;
        
        if (isEdge) {
          const i = (y * canvas.width + x) * 4;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }
    }
    
    if (count === 0) {
      return '#ffffff';
    }
    
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    
    return this.rgbToHex(r, g, b);
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
