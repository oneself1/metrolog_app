import OCRService from './ocrService';
import ActiveLearningService from './activeLearningService';

class AdaptiveOCRService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    await ActiveLearningService.initialize();
    this.isInitialized = true;
  }

  async recognizeWithLearning(imageData, context = {}) {
    // Базовое распознавание
    const baseResult = await OCRService.recognizeDigits(imageData);
    
    if (!baseResult.success) {
      return baseResult;
    }

    // Извлекаем характеристики изображения для обучения
    const imageFeatures = await this.extractImageFeatures(imageData);
    
    // Применяем выученные правила коррекции
    const correctedResult = ActiveLearningService.applyLearnedCorrections(
      { ...baseResult, imageFeatures },
      context
    );

    return {
      ...correctedResult,
      learningContext: {
        features: imageFeatures,
        context: context
      }
    };
  }

  async extractImageFeatures(imageData) {
    try {
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          resolve({
            brightness: this.calculateBrightness(imageDataObj),
            contrast: this.calculateContrast(imageDataObj),
            sharpness: this.estimateSharpness(imageDataObj),
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height
          });
        };
        img.src = imageData;
      });
    } catch (error) {
      console.error('Failed to extract image features:', error);
      return {
        brightness: 0.5,
        contrast: 0.5,
        sharpness: 0.5,
        width: 0,
        height: 0,
        aspectRatio: 1
      };
    }
  }

  calculateBrightness(imageData) {
    const data = imageData.data;
    let total = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
      total += brightness;
    }
    
    return total / (data.length / 4) / 255;
  }

  calculateContrast(imageData) {
    const data = imageData.data;
    const brightnessValues = [];
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
      brightnessValues.push(brightness);
    }
    
    const mean = brightnessValues.reduce((a, b) => a + b) / brightnessValues.length;
    const variance = brightnessValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / brightnessValues.length;
    
    return Math.sqrt(variance) / 255;
  }

  estimateSharpness(imageData) {
    // Упрощенная оценка резкости через градиенты
    const data = imageData.data;
    let gradientSum = 0;
    const width = imageData.width;
    
    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const rightIdx = (y * width + (x + 1)) * 4;
        const bottomIdx = ((y + 1) * width + x) * 4;
        
        const horizontalGradient = Math.abs(
          (data[idx] + data[idx+1] + data[idx+2]) - 
          (data[rightIdx] + data[rightIdx+1] + data[rightIdx+2])
        );
        
        const verticalGradient = Math.abs(
          (data[idx] + data[idx+1] + data[idx+2]) - 
          (data[bottomIdx] + data[bottomIdx+1] + data[bottomIdx+2])
        );
        
        gradientSum += (horizontalGradient + verticalGradient) / 2;
      }
    }
    
    const maxPossibleGradient = 765 * (width - 2) * (imageData.height - 2); // 255 * 3 на пиксель
    return gradientSum / maxPossibleGradient;
  }

  // Регистрация пользовательского исправления
  registerUserCorrection(recognitionResult, userInput, context) {
    if (!recognitionResult.learningContext) {
      console.warn('No learning context available for correction');
      return;
    }

    ActiveLearningService.saveUserCorrection(
      recognitionResult,
      userInput,
      recognitionResult.learningContext.features,
      { ...context, ...recognitionResult.learningContext.context }
    );
  }
}

export default new AdaptiveOCRService();
