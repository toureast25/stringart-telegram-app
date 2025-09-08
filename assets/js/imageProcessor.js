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
      blurInput: document.getElementById('blurInput')
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
    // Обработчики для настроек разрешения
    this.elements.resolutionRange?.addEventListener('input', (e) => {
      this.elements.resolutionInput.value = e.target.value;
      this.updatePercent();
      this.applyResolution();
    });
    
    this.elements.resolutionInput?.addEventListener('input', (e) => {
      this.elements.resolutionRange.value = e.target.value;
      this.updatePercent();
      this.applyResolution();
    });
    
    // Обработчики для размытия
    this.elements.blurRange?.addEventListener('input', (e) => {
      this.elements.blurInput.value = e.target.value;
      this.applyResolution();
    });
    
    this.elements.blurInput?.addEventListener('input', (e) => {
      this.elements.blurRange.value = e.target.value;
      this.applyResolution();
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
    this.elements.previewImg.src = dataURL;
    this.elements.preview.classList.add('active');
    
    // Обновляем состояние приложения
    this.app.setOriginalImage(dataURL, width);
    
    // Настройка элементов управления
    this.setupControls(width);
    
    // Применяем начальные настройки
    this.applyResolution();
    
    // Автоматическое определение фона
    this.autoDetectBackground();
  }
  
  setupControls(width) {
    this.elements.resolutionRange.max = width;
    this.elements.resolutionInput.max = width;
    this.elements.resolutionRange.value = width * 0.2;
    this.elements.resolutionInput.value = width * 0.2;
    this.updatePercent();
    
    // Показываем кнопки управления
    document.getElementById('uploadBtn').style.display = 'none';
    document.getElementById('cameraBtn').style.display = 'none';
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
      const newWidth = parseInt(this.elements.resolutionInput.value);
      const scale = newWidth / this.app.state.originalWidth;
      
      const ctx = this.snapshotCanvas.getContext('2d');
      this.snapshotCanvas.width = newWidth;
      this.snapshotCanvas.height = img.height * scale;
      
      // Применяем размытие
      ctx.filter = `blur(${this.elements.blurInput.value}px)`;
      ctx.drawImage(img, 0, 0, this.snapshotCanvas.width, this.snapshotCanvas.height);
      ctx.filter = '';
      
      // Обновляем второе изображение
      this.elements.secondImg.onload = () => {
        this.elements.secondPreview.classList.add('active');
        document.getElementById('paletteSection').classList.add('active');
        
        // Запускаем анализ цветов
        this.app.colorAnalyzer?.extractPalette();
      };
      
      this.elements.secondImg.src = this.snapshotCanvas.toDataURL('image/png');
      this.elements.secondImg.style.width = '100%';
    };
    img.src = this.app.state.originalImage;
  }
  
  autoDetectBackground() {
    if (!this.elements.previewImg.complete) return;
    
    const bgColor = Utils.getAverageEdgeColor(this.elements.previewImg);
    this.app.setBackgroundColor(bgColor);
  }
  
  reset() {
    // Сброс UI элементов
    this.elements.previewImg.removeAttribute('src');
    this.elements.preview.classList.remove('active');
    this.elements.secondImg.removeAttribute('src');
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
