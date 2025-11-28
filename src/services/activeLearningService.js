import Database from './database';

class ActiveLearningService {
  constructor() {
    this.learningThreshold = 5; // Минимум примеров для создания правила
    this.correctionRules = new Map();
    this.mistakePatterns = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await this.loadCorrectionRules();
      await this.loadMistakePatterns();
      this.isInitialized = true;
      console.log('Active Learning Service initialized');
    } catch (error) {
      console.error('Failed to initialize Active Learning:', error);
    }
  }

  // Сохранение пользовательского исправления
  async saveUserCorrection(originalRecognition, userCorrection, imageFeatures, context) {
    const trainingData = {
      original: originalRecognition,
      corrected: userCorrection,
      imageFeatures: imageFeatures,
      context: context,
      confidence: originalRecognition.confidence || 0,
      timestamp: new Date().toISOString(),
      patternType: this.identifyPatternType(originalRecognition, userCorrection),
      isResolved: false
    };

    try {
      // Сохраняем в базу
      await Database.saveTrainingData(trainingData);
      
      // Анализируем паттерн ошибки
      await this.analyzeMistakePattern(trainingData);
      
      // Проверяем, можно ли создать новое правило
      await this.checkForNewRule(trainingData.patternType);
      
      console.log('User correction saved for learning');
    } catch (error) {
      console.error('Failed to save user correction:', error);
    }
  }

  // Идентификация типа ошибки
  identifyPatternType(original, corrected) {
    const orig = original.processedValue || '';
    const corr = corrected || '';

    if (!orig || !corr) return 'unknown';

    // Анализ типа ошибки
    if (this.isDigitConfusion(orig, corr)) {
      return 'digit_confusion';
    }
    
    if (this.isExtraDigit(orig, corr)) {
      return 'extra_digit';
    }
    
    if (this.isMissingDigit(orig, corr)) {
      return 'missing_digit';
    }
    
    if (this.isFormatError(orig, corr)) {
      return 'format_error';
    }

    return 'other';
  }

  // Анализ паттерна ошибки
  async analyzeMistakePattern(trainingData) {
    const patternKey = `${trainingData.patternType}_${trainingData.original.processedValue}_${trainingData.corrected}`;
    
    const existing = this.mistakePatterns.get(patternKey) || {
      count: 0,
      contexts: [],
      confidenceSum: 0,
      firstSeen: new Date(),
      lastSeen: new Date()
    };

    existing.count++;
    existing.confidenceSum += trainingData.confidence;
    existing.contexts.push(trainingData.context);
    existing.lastSeen = new Date();

    this.mistakePatterns.set(patternKey, existing);
    
    // Сохраняем в базу
    await Database.saveErrorStat({
      patternKey: patternKey,
      ...existing,
      timestamp: new Date().toISOString()
    });
  }

  // Создание правил коррекции
  async checkForNewRule(patternType) {
    const relevantPatterns = Array.from(this.mistakePatterns.entries())
      .filter(([key, pattern]) => key.startsWith(patternType) && pattern.count >= this.learningThreshold);

    for (const [patternKey, pattern] of relevantPatterns) {
      if (!this.correctionRules.has(patternKey)) {
        const newRule = this.createCorrectionRule(patternKey, pattern);
        await Database.saveCorrectionRule(newRule);
        this.correctionRules.set(patternKey, newRule);
        
        console.log(`Created new correction rule: ${patternKey}`);
      }
    }
  }

  createCorrectionRule(patternKey, pattern) {
    const [type, from, to] = patternKey.split('_');
    const avgConfidence = pattern.confidenceSum / pattern.count;
    
    return {
      pattern: patternKey,
      type: type,
      from: from,
      to: to,
      conditions: this.analyzeConditions(pattern.contexts),
      effectiveness: this.calculateEffectiveness(pattern),
      confidence: avgConfidence,
      usageCount: 0,
      successCount: 0,
      createdAt: new Date().toISOString()
    };
  }

  // Применение правил к новым распознаваниям
  applyLearnedCorrections(recognitionResult, context) {
    if (!this.isInitialized || !recognitionResult.success) {
      return recognitionResult;
    }

    let correctedValue = recognitionResult.processedValue;
    const appliedRules = [];

    for (const [patternKey, rule] of this.correctionRules.entries()) {
      if (this.shouldApplyRule(rule, recognitionResult, context)) {
        const originalValue = correctedValue;
        correctedValue = this.applyRule(rule, correctedValue);
        
        if (originalValue !== correctedValue) {
          appliedRules.push({
            rule: patternKey,
            from: originalValue,
            to: correctedValue
          });
          
          // Обновляем статистику использования правила
          rule.usageCount++;
          this.updateRuleEffectiveness(rule, true);
        }
      }
    }

    return {
      ...recognitionResult,
      processedValue: correctedValue,
      appliedRules: appliedRules,
      originalValue: recognitionResult.processedValue,
      wasCorrected: appliedRules.length > 0
    };
  }

  // Условия применения правила
  shouldApplyRule(rule, recognition, context) {
    // Проверяем соответствие контекста
    const contextMatch = this.checkContextMatch(rule.conditions, context);
    
    // Проверяем уверенность исходного распознавания
    const confidenceMatch = recognition.confidence < (rule.confidence + 0.2);
    
    // Проверяем паттерн значения
    const valueMatch = recognition.processedValue && recognition.processedValue.includes(rule.from);
    
    return contextMatch && confidenceMatch && valueMatch;
  }

  applyRule(rule, value) {
    if (!value) return value;

    switch (rule.type) {
      case 'digit_confusion':
        return value.replace(new RegExp(rule.from, 'g'), rule.to);
      
      case 'extra_digit':
        return value.replace(new RegExp(rule.from, 'g'), rule.to);
      
      case 'missing_digit':
        return value.replace(rule.from, rule.to);
      
      case 'format_error':
        return this.applyFormatCorrection(value, rule);
      
      default:
        return value;
    }
  }

  applyFormatCorrection(value, rule) {
    // Коррекция формата (например, добавление десятичного разделителя)
    // Это упрощенная реализация
    return value;
  }

  // Вспомогательные методы
  isDigitConfusion(orig, corr) {
    if (orig.length !== corr.length) return false;
    
    let differences = 0;
    for (let i = 0; i < orig.length; i++) {
      if (orig[i] !== corr[i] && this.isDigit(orig[i]) && this.isDigit(corr[i])) {
        differences++;
      }
    }
    return differences === 1;
  }

  isExtraDigit(orig, corr) {
    return orig.length === corr.length + 1 && corr.includes(orig.replace(/\D/g, ''));
  }

  isMissingDigit(orig, corr) {
    return orig.length + 1 === corr.length && orig.includes(corr.replace(/\D/g, ''));
  }

  isFormatError(orig, corr) {
    const origDigits = orig.replace(/\D/g, '');
    const corrDigits = corr.replace(/\D/g, '');
    return origDigits === corrDigits && orig !== corr;
  }

  isDigit(char) {
    return /^\d$/.test(char);
  }

  analyzeConditions(contexts) {
    const commonConditions = {
      deviceTypes: [...new Set(contexts.map(c => c.deviceType).filter(Boolean))],
      lightingConditions: this.findCommonLighting(contexts),
      imageQuality: this.calculateAverageQuality(contexts)
    };
    
    return commonConditions;
  }

  findCommonLighting(contexts) {
    // Упрощенная реализация
    const qualities = contexts.map(c => c.imageFeatures?.brightness).filter(Boolean);
    const avg = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    return avg > 0.5 ? 'good' : 'poor';
  }

  calculateAverageQuality(contexts) {
    const qualities = contexts.map(c => c.imageFeatures?.sharpness).filter(Boolean);
    return qualities.reduce((a, b) => a + b, 0) / qualities.length || 0.5;
  }

  calculateEffectiveness(pattern) {
    return Math.min(pattern.count / this.learningThreshold, 1.0);
  }

  checkContextMatch(conditions, context) {
    if (!conditions.deviceTypes.length) return true;
    
    return conditions.deviceTypes.includes(context.deviceType);
  }

  async updateRuleEffectiveness(rule, success) {
    if (success) {
      rule.successCount++;
    }
    
    rule.effectiveness = rule.successCount / rule.usageCount;
    
    // Обновляем в базе
    const rules = await Database.getAllCorrectionRules();
    const dbRule = rules.find(r => r.pattern === rule.pattern);
    if (dbRule) {
      await Database.updateCorrectionRule(dbRule.id, {
        usageCount: rule.usageCount,
        successCount: rule.successCount,
        effectiveness: rule.effectiveness
      });
    }
  }

  // Загрузка данных из базы
  async loadCorrectionRules() {
    try {
      const rules = await Database.getAllCorrectionRules();
      rules.forEach(rule => {
        this.correctionRules.set(rule.pattern, rule);
      });
      console.log(`Loaded ${rules.length} correction rules`);
    } catch (error) {
      console.error('Failed to load correction rules:', error);
    }
  }

  async loadMistakePatterns() {
    try {
      const stats = await Database.getErrorStats();
      stats.forEach(stat => {
        this.mistakePatterns.set(stat.patternKey, stat);
      });
      console.log(`Loaded ${stats.length} mistake patterns`);
    } catch (error) {
      console.error('Failed to load mistake patterns:', error);
    }
  }

  // Получение статистики
  async getLearningStatistics() {
    const trainingData = await Database.getTrainingData();
    const rules = await Database.getAllCorrectionRules();
    const stats = await Database.getErrorStats();

    return {
      trainingExamples: trainingData.length,
      rulesCount: rules.length,
      mistakePatterns: stats.length,
      successRate: rules.length > 0 ? 
        rules.reduce((sum, rule) => sum + (rule.effectiveness || 0), 0) / rules.length * 100 : 0
    };
  }

  async getCorrectionRules() {
    return Array.from(this.correctionRules.values());
  }

  async getMistakePatterns() {
    return Array.from(this.mistakePatterns.values());
  }
}

// Инициализируем сервис
const activeLearningService = new ActiveLearningService();
activeLearningService.initialize();

export default activeLearningService;
