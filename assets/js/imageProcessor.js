/**
 * ImageProcessor - Модуль для обработки изображений
 * Отвечает за загрузку, изменение размера и применение эффектов к изображениям
 */

class ImageProcessor {
  constructor(app) {
    this.app = app;
    this.fileInput = this.createFileInput();
    this.cameraStream = null;
    this.snapshotCanvas = document.getElementById('snapshotCanvas');
    
    this.elements = {
      preview: document.getElementById('preview'),
      previewImg: document.getElementById('previewImg'),
      secondPreview: document.getElementById('secondPreview'),
      secondImg: document.getElementById('secondImg'),
      cameraStream: document.getElementById('cameraStream'),
      resolutionRange: document.getElementById('resolutionRange'),
      resolutionInput: document.getElementById('resolutionInput'),
      percentDisplay: document.getElementById('percentDisplay'),
      blurRange: document.getElementById('blurRange'),
      blurInput: document.getElementById('blurInput'),
    };
    
    this.bindEvents();
  }
  
  createFileInput() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleFile(file);
    });
    
    return fileInput;
  }
  
  bindEvents() {
    // Функция для обновления разрешения
    const updateResolution = (value) => {
      this.elements.resolutionInput.value = value;
      this.elements.resolutionRange.value = value;
      this.updatePercent();
      this.applyResolution();
    };
    
    // Функция для обновления размытия с debouncing
    let blurTimeout;
    const updateBlur = (value) => {
      const blurValue = parseFloat(value) || 0;
      this.elements.blurInput.value = blurValue;
      this.elements.blurRange.value = blurValue;
      
      // Debouncing для плавности работы
      clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        this.applyResolution();
      }, 12); // Задержка 12ms
    };
    
    // Обработчики для настроек разрешения - добавляем множественные события для мобильных
    this.elements.resolutionRange?.addEventListener('input', (e) => {
      updateResolution(e.target.value);
    });
    
    this.elements.resolutionRange?.addEventListener('change', (e) => {
      updateResolution(e.target.value);
    });
    
    this.elements.resolutionRange?.addEventListener('touchend', (e) => {
      updateResolution(e.target.value);
    });
    
    this.elements.resolutionInput?.addEventListener('input', (e) => {
      updateResolution(e.target.value);
    });
    
    this.elements.resolutionInput?.addEventListener('change', (e) => {
      updateResolution(e.target.value);
    });
    
    // Обработчики для размытия - добавляем множественные события для мобильных
    this.elements.blurRange?.addEventListener('input', (e) => {
      updateBlur(e.target.value);
    });
    
    this.elements.blurRange?.addEventListener('change', (e) => {
      updateBlur(e.target.value);
    });
    
    this.elements.blurRange?.addEventListener('touchend', (e) => {
      updateBlur(e.target.value);
    });
    
    this.elements.blurInput?.addEventListener('input', (e) => {
      updateBlur(e.target.value);
    });
    
    this.elements.blurInput?.addEventListener('change', (e) => {
      updateBlur(e.target.value);
    });
    
  }
  
  openFileDialog() {
    this.fileInput.click();
  }
  
  async openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.cameraStream = stream;
      this.elements.cameraStream.srcObject = stream;
      this.elements.cameraStream.style.display = 'block';
      
      // Автоматический снимок через 3 секунды
      setTimeout(() => this.takeSnapshot(stream), 3000);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Не удалось открыть камеру: ' + error.message);
    }
  }
  
  takeSnapshot(stream) {
    const ctx = this.snapshotCanvas.getContext('2d');
    this.snapshotCanvas.width = this.elements.cameraStream.videoWidth;
    this.snapshotCanvas.height = this.elements.cameraStream.videoHeight;
    ctx.drawImage(this.elements.cameraStream, 0, 0);
    
    const dataURL = this.snapshotCanvas.toDataURL('image/png');
    this.loadImageFromDataURL(dataURL, this.elements.cameraStream.videoWidth);
    
    // Закрываем камеру
    this.elements.cameraStream.style.display = 'none';
    stream.getTracks().forEach(track => track.stop());
    this.cameraStream = null;
  }
  
  handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        this.loadImageFromDataURL(reader.result, img.width);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  
  loadImage(url) {
    // Для тестового изображения используем прямой URL
    const defaultImgUrl = 'https://sun9-83.userapi.com/s/v1/ig1/XJRPO-T4RuE0KFMctnOM20rCs68dYcO4H5KnFW6s5E_x1BlQhkN2lojil1AW11LQ6xGG1uKa.jpg?quality=96&as=32x40,48x60,72x90,108x135,160x200,240x300,360x449,480x599,540x674,640x799,720x899,865x1080&from=bu&cs=865x0';
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Копируем изображение в canvas для получения dataURL
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = tempCanvas.toDataURL('image/png');
      this.loadImageFromDataURL(dataURL, img.width);
    };
    img.onerror = () => {
      console.error('Failed to load default image, trying fallback');
      // Fallback - создаем простое тестовое изображение
      this.createFallbackImage();
    };
    img.src = defaultImgUrl;
  }
  
  createFallbackImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    // Создаем простой градиент как тестовое изображение
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#4ecdc4');
    gradient.addColorStop(1, '#45b7d1');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);
    
    // Добавляем текст
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Test Image', 200, 150);
    ctx.font = '16px Arial';
    ctx.fillText('StringArt Generator', 200, 180);
    
    const dataURL = canvas.toDataURL('image/png');
    this.loadImageFromDataURL(dataURL, 400);
  }
  
  loadImageFromDataURL(dataURL, width) {
    // Используем обработчик onload для надежной загрузки на мобильных
    this.elements.previewImg.onload = () => {
      // Вычисляем высоту на основе пропорций изображения
      const aspectRatio = this.elements.previewImg.naturalHeight / this.elements.previewImg.naturalWidth;
      const height = Math.round(width * aspectRatio);
      
      // Обновляем состояние приложения
      this.app.setOriginalImage(dataURL, width, height);
      
      // Настройка элементов управления
      this.setupControls(width);
      
      // Применяем начальные настройки
      this.applyResolution();
      
      // Автоматическое определение фона - только после полной загрузки
      setTimeout(() => this.autoDetectBackground(), 100);
    };
    
    this.elements.previewImg.src = dataURL;
    this.elements.preview.classList.add('active');
  }
  
  setupControls(width) {
    // Ограничиваем максимальное разрешение для мобильных устройств
    let maxWidth = width;
    if (this.isMobileDevice()) {
      // На мобильных ограничиваем до 400px для максимальной стабильности
      maxWidth = Math.min(width, 400);
      console.log('Mobile device detected, limiting max resolution to', maxWidth);
      
      // Дополнительно ограничиваем для Telegram
      if (this.isTelegramWebApp()) {
        maxWidth = Math.min(maxWidth, 350);
        console.log('Telegram WebApp detected, further limiting to', maxWidth);
      }
    }
    
    this.elements.resolutionRange.max = maxWidth;
    this.elements.resolutionInput.max = maxWidth;
    this.elements.resolutionRange.value = Math.min(width * 0.2, maxWidth);
    this.elements.resolutionInput.value = Math.min(width * 0.2, maxWidth);
    this.updatePercent();
    
    // Показываем все кнопки управления - пользователь должен иметь возможность загрузить свое изображение
    document.getElementById('uploadBtn').style.display = '';
    document.getElementById('cameraBtn').style.display = '';
    document.getElementById('resetBtn').style.display = '';
  }
  
  updatePercent() {
    const percent = Math.round((this.elements.resolutionInput.value / this.app.state.originalWidth) * 100);
    this.elements.percentDisplay.textContent = percent + '%';
  }
  
  applyResolution() {
    if (!this.app.state.originalImage) return;
    
    const img = new Image();
    img.onload = () => {
      // Проверяем размер изображения для предотвращения проблем с памятью на мобильных
      const newWidth = parseInt(this.elements.resolutionInput.value);
      const newHeight = this.app.state.originalHeight * (newWidth / this.app.state.originalWidth);
      const imageSize = newWidth * newHeight;
      
      if (this.isMobileDevice() && imageSize > 400000) { // > 400k пикселей
        console.warn('Large image size on mobile device:', imageSize);
        if (this.app.telegramAPI) {
          this.app.telegramAPI.showAlert('Внимание: большое разрешение может замедлить работу на мобильном устройстве');
        }
      }
      
      const scale = newWidth / this.app.state.originalWidth;
      
      const ctx = this.snapshotCanvas.getContext('2d');
      this.snapshotCanvas.width = newWidth;
      this.snapshotCanvas.height = newHeight;
      
      // Применяем размытие
      const blurValue = parseFloat(this.elements.blurInput.value) || 0;
      
      if (blurValue > 0) {
        // Проверяем поддержку filter в canvas
        const supportsFilter = 'filter' in ctx;
        
        if (supportsFilter) {
          // Современные браузеры
          const filterValue = `blur(${blurValue}px)`;
          ctx.filter = filterValue;
          ctx.drawImage(img, 0, 0, this.snapshotCanvas.width, this.snapshotCanvas.height);
          ctx.filter = 'none'; // Сбрасываем фильтр
          
        } else {
          // Fallback для старых браузеров - используем программное размытие
          ctx.drawImage(img, 0, 0, this.snapshotCanvas.width, this.snapshotCanvas.height);
          this.applyProgrammaticBlur(ctx, this.snapshotCanvas.width, this.snapshotCanvas.height, blurValue);
        }
      } else {
        // Без размытия
        ctx.drawImage(img, 0, 0, this.snapshotCanvas.width, this.snapshotCanvas.height);
      }
      
      // Обновляем второе изображение
      const newDataURL = this.snapshotCanvas.toDataURL('image/png');
      
      // Проверяем, изменилось ли изображение
      const imageChanged = this.elements.secondImg.src !== newDataURL;
      
      this.elements.secondImg.onload = () => {
        this.elements.secondPreview.classList.add('active');
        document.getElementById('paletteSection').classList.add('active');
        
        // Запускаем анализ цветов
        this.app.colorAnalyzer?.extractPalette();
      };
      
      this.elements.secondImg.src = newDataURL;
      this.elements.secondImg.style.width = '100%';
      
      // Принудительное обновление для мобильных устройств и Telegram
      if (this.isMobileDevice() || this.isTelegramWebApp()) {
        // Специальная обработка для Telegram WebApp
        if (this.isTelegramWebApp()) {
          // Принудительно обновляем DOM для Telegram
          const parent = this.elements.secondImg.parentNode;
          const nextSibling = this.elements.secondImg.nextSibling;
          parent.removeChild(this.elements.secondImg);
          parent.insertBefore(this.elements.secondImg, nextSibling);
        } else {
          // Принудительно перерисовываем изображение для обычных мобильных
          this.elements.secondImg.style.display = 'none';
          setTimeout(() => {
            this.elements.secondImg.style.display = 'block';
          }, 50);
        }
      }
      
      // НЕ применяем CSS размытие - оно влияет на весь интерфейс
      // Размытие должно быть только в Canvas, а изображение показываем без CSS фильтров
      this.elements.secondImg.style.filter = 'none';
      
      // ВАЖНО: Принудительно пересчитываем палитру, даже если onload не сработает
      // Это нужно для случаев, когда изображение уже загружено и onload не вызывается
      setTimeout(() => {
        if (this.app.colorAnalyzer) {
          this.app.colorAnalyzer.extractPalette();
        }
      }, 12);
      
      // Дополнительная попытка через больший интервал для мобильных устройств
      setTimeout(() => {
        if (this.app.colorAnalyzer && this.elements.secondImg.complete) {
          this.app.colorAnalyzer.extractPalette();
        }
      }, 36);
      
      // Специальная обработка для Telegram WebApp - еще более агрессивный пересчет
      if (this.isTelegramWebApp()) {
        setTimeout(() => {
          if (this.app.colorAnalyzer) {
            this.app.colorAnalyzer.extractPalette();
            
            // Принудительно обновляем маски
            if (this.app.actualColors) {
              this.app.actualColors.update();
            }
          }
        }, 61);
      }
    };
    img.src = this.app.state.originalImage;
  }
  
  // Определение мобильного устройства и Telegram
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768 ||
           ('ontouchstart' in window) ||
           (window.Telegram && window.Telegram.WebApp);
  }
  
  // Проверка на Telegram WebApp
  isTelegramWebApp() {
    return window.Telegram && window.Telegram.WebApp;
  }
  
  autoDetectBackground() {
    if (!this.elements.previewImg.complete || !this.elements.previewImg.naturalWidth) {
      // Если изображение еще не загружено, попробуем несколько раз с увеличивающимся интервалом
      let retryCount = 0;
      const maxRetries = 20; // максимум 20 попыток (2 секунды)
      
      const retryDetection = () => {
        retryCount++;
        if (retryCount > maxRetries) {
          console.warn('Auto background detection failed - image not loaded');
          return;
        }
        
        if (this.elements.previewImg.complete && this.elements.previewImg.naturalWidth > 0) {
          this.performBackgroundDetection();
        } else {
          setTimeout(retryDetection, 100 * retryCount); // увеличиваем интервал
        }
      };
      
      setTimeout(retryDetection, 100);
      return;
    }
    
    this.performBackgroundDetection();
  }
  
  performBackgroundDetection() {
    const bgEdgePercent = document.getElementById('bgEdgePercent');
    const percent = bgEdgePercent ? parseInt(bgEdgePercent.value) || 10 : 10;
    const bgColor = Utils.getAverageEdgeColor(this.elements.previewImg, percent);
    this.app.setBackgroundColor(bgColor);
  }
  
  applyProgrammaticBlur(ctx, width, height, blurRadius) {
    // Простое программное размытие методом box blur
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const blurredData = new Uint8ClampedArray(data);
    
    const radius = Math.round(blurRadius);
    if (radius <= 0) return;
    
    // Горизонтальный проход
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const index = (y * width + nx) * 4;
          r += data[index];
          g += data[index + 1];
          b += data[index + 2];
          a += data[index + 3];
          count++;
        }
        
        const index = (y * width + x) * 4;
        blurredData[index] = r / count;
        blurredData[index + 1] = g / count;
        blurredData[index + 2] = b / count;
        blurredData[index + 3] = a / count;
      }
    }
    
    // Вертикальный проход
    const finalData = new Uint8ClampedArray(blurredData);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const index = (ny * width + x) * 4;
          r += blurredData[index];
          g += blurredData[index + 1];
          b += blurredData[index + 2];
          a += blurredData[index + 3];
          count++;
        }
        
        const index = (y * width + x) * 4;
        finalData[index] = r / count;
        finalData[index + 1] = g / count;
        finalData[index + 2] = b / count;
        finalData[index + 3] = a / count;
      }
    }
    
    const finalImageData = new ImageData(finalData, width, height);
    ctx.putImageData(finalImageData, 0, 0);
    console.log('Programmatic blur applied with radius:', radius);
  }
  
  reset() {
    // Сброс UI элементов
    this.elements.previewImg.removeAttribute('src');
    this.elements.preview.classList.remove('active');
    this.elements.secondImg.removeAttribute('src');
    this.elements.secondImg.style.filter = 'none'; // Сбрасываем CSS размытие
    this.elements.secondPreview.classList.remove('active');
    this.elements.cameraStream.style.display = 'none';
    
    // Сброс значений
    this.elements.resolutionRange.value = 200;
    this.elements.resolutionInput.value = 200;
    this.elements.percentDisplay.textContent = '20%';
    this.elements.blurRange.value = 0;
    this.elements.blurInput.value = 0;
    
    // Показываем кнопки загрузки
    document.getElementById('uploadBtn').style.display = '';
    document.getElementById('cameraBtn').style.display = '';
    document.getElementById('testImageBtn').style.display = '';
    document.getElementById('resetBtn').style.display = 'none';
    
    // Закрываем камеру если открыта
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }
  
  onStateChange(state) {
    // Реагируем на изменения состояния приложения
    if (state.backgroundColor !== this.lastBackgroundColor) {
      this.lastBackgroundColor = state.backgroundColor;
      this.updateBackgroundDisplay(state.backgroundColor);
    }
  }
  
  updateBackgroundDisplay(color) {
    const currentBgColor = document.getElementById('currentBgColor');
    const bgColorPicker = document.getElementById('bgColorPicker');
    
    if (currentBgColor) {
      currentBgColor.textContent = color;
      currentBgColor.style.background = color;
    }
    
    if (bgColorPicker) {
      bgColorPicker.value = color;
    }
  }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageProcessor;
}
