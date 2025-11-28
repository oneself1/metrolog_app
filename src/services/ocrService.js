import { createWorker } from 'tesseract.js';

class OCRService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        console.log('Initializing Tesseract.js...');
        this.worker = await createWorker('eng+rus', 1, {
          logger: m => console.log(m),
          errorHandler: err => console.error('OCR Error:', err)
        });

        await this.worker.setParameters({
          tessedit_char_whitelist: '0123456789., ',
          tessedit_pageseg_mode: '8', // PSM.SINGLE_WORD
          tessedit_ocr_engine_mode: '1' // OEM.LSTM_ONLY
        });

        this.isInitialized = true;
        console.log('Tesseract.js initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Tesseract:', error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async recognizeDigits(imageData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('Starting OCR recognition...');
      const { data: { text, confidence } } = await this.worker.recognize(imageData);
      
      console.log('Raw OCR text:', text);
      console.log('Confidence:', confidence);

      const processedResult = this.postProcessText(text);
      
      const result = {
        rawText: text,
        processedValue: processedResult,
        confidence: confidence,
        timestamp: new Date().toISOString(),
        success: true
      };

      console.log('Processed result:', result);
      return result;

    } catch (error) {
      console.error('OCR recognition failed:', error);
      return {
        rawText: '',
        processedValue: null,
        confidence: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };
    }
  }

  postProcessText(text) {
    if (!text) return null;

    // Очистка текста - оставляем только цифры, точки и запятые
    let cleanText = text.replace(/[^\d,.]/g, '');
    
    // Удаляем ведущие нули, но сохраняем десятичные
    cleanText = cleanText.replace(/^0+(\d)/, '$1');
    
    // Ищем последовательности цифр (показания счетчика)
    const digitSequences = cleanText.match(/[\d,.]+\d+/g);
    
    if (digitSequences && digitSequences.length > 0) {
      // Выбираем наиболее вероятное значение (самую длинную последовательность)
      const bestMatch = digitSequences.reduce((a, b) => 
        a.replace(/[^\d]/g, '').length > b.replace(/[^\d]/g, '').length ? a : b
      );
      
      // Нормализуем формат - заменяем запятые на точки для десятичных
      const normalized = bestMatch.replace(',', '.');
      
      return normalized;
    }
    
    return null;
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.initializationPromise = null;
    }
  }

  // Дополнительные методы для улучшения распознавания
  async recognizeWithPreprocessing(imageData) {
    // Здесь можно добавить предобработку изображения
    const processedImage = await this.preprocessImage(imageData);
    return this.recognizeDigits(processedImage);
  }

  async preprocessImage(imageData) {
    // Базовая предобработка изображения
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Устанавливаем размеры canvas
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Рисуем изображение
        ctx.drawImage(img, 0, 0);
        
        // Базовые улучшения
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const enhancedData = this.enhanceContrast(imageData);
        ctx.putImageData(enhancedData, 0, 0);
        
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.src = imageData;
    });
  }

  enhanceContrast(imageData) {
    // Простое улучшение контраста
    const data = imageData.data;
    const factor = 1.5; // Коэффициент контраста
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = this.clamp((data[i] - 128) * factor + 128);     // R
      data[i + 1] = this.clamp((data[i + 1] - 128) * factor + 128); // G
      data[i + 2] = this.clamp((data[i + 2] - 128) * factor + 128); // B
    }
    
    return imageData;
  }

  clamp(value) {
    return Math.max(0, Math.min(255, value));
  }
}

export default new OCRService();
