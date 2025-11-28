class VerificationDatabase {
  constructor() {
    this.dbName = 'VerificationApp';
    this.version = 2;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Хранилище для протоколов поверки
        if (!db.objectStoreNames.contains('protocols')) {
          const store = db.createObjectStore('protocols', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('deviceType', 'deviceType', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Хранилище для изображений
        if (!db.objectStoreNames.contains('images')) {
          const store = db.createObjectStore('images', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('protocolId', 'protocolId', { unique: false });
        }

        // Хранилище для обучающих данных
        if (!db.objectStoreNames.contains('trainingData')) {
          const store = db.createObjectStore('trainingData', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('patternType', 'patternType', { unique: false });
          store.createIndex('isResolved', 'isResolved', { unique: false });
        }

        // Хранилище для правил коррекции
        if (!db.objectStoreNames.contains('correctionRules')) {
          const store = db.createObjectStore('correctionRules', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('pattern', 'pattern', { unique: false });
        }

        // Хранилище для статистики ошибок
        if (!db.objectStoreNames.contains('errorStats')) {
          const store = db.createObjectStore('errorStats', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('errorType', 'errorType', { unique: false });
        }
      };
    });
  }

  // Протоколы
  async saveProtocol(protocolData) {
    const transaction = this.db.transaction(['protocols'], 'readwrite');
    const store = transaction.objectStore('protocols');
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...protocolData,
        date: new Date().toISOString(),
        status: 'draft',
        createdAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProtocols() {
    const transaction = this.db.transaction(['protocols'], 'readonly');
    const store = transaction.objectStore('protocols');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProtocol(id) {
    const transaction = this.db.transaction(['protocols'], 'readonly');
    const store = transaction.objectStore('protocols');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateProtocol(id, updates) {
    const transaction = this.db.transaction(['protocols'], 'readwrite');
    const store = transaction.objectStore('protocols');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const data = request.result;
        const updatedData = { ...data, ...updates, updatedAt: new Date().toISOString() };
        const updateRequest = store.put(updatedData);
        updateRequest.onsuccess = () => resolve(updateRequest.result);
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProtocol(id) {
    const transaction = this.db.transaction(['protocols'], 'readwrite');
    const store = transaction.objectStore('protocols');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Изображения
  async saveImage(protocolId, imageData, recognitionResult) {
    const transaction = this.db.transaction(['images'], 'readwrite');
    const store = transaction.objectStore('images');
    return new Promise((resolve, reject) => {
      const request = store.add({
        protocolId,
        imageData,
        recognitionResult,
        timestamp: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getImagesByProtocol(protocolId) {
    const transaction = this.db.transaction(['images'], 'readonly');
    const store = transaction.objectStore('images');
    const index = store.index('protocolId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(protocolId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Обучающие данные
  async saveTrainingData(data) {
    const transaction = this.db.transaction(['trainingData'], 'readwrite');
    const store = transaction.objectStore('trainingData');
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTrainingData(patternType = null) {
    const transaction = this.db.transaction(['trainingData'], 'readonly');
    const store = transaction.objectStore('trainingData');
    
    if (patternType) {
      const index = store.index('patternType');
      return new Promise((resolve, reject) => {
        const request = index.getAll(patternType);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Правила коррекции
  async saveCorrectionRule(rule) {
    const transaction = this.db.transaction(['correctionRules'], 'readwrite');
    const store = transaction.objectStore('correctionRules');
    return new Promise((resolve, reject) => {
      const request = store.add(rule);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCorrectionRules() {
    const transaction = this.db.transaction(['correctionRules'], 'readonly');
    const store = transaction.objectStore('correctionRules');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateCorrectionRule(id, updates) {
    const transaction = this.db.transaction(['correctionRules'], 'readwrite');
    const store = transaction.objectStore('correctionRules');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const data = request.result;
        const updatedData = { ...data, ...updates };
        const updateRequest = store.put(updatedData);
        updateRequest.onsuccess = () => resolve(updateRequest.result);
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Статистика ошибок
  async saveErrorStat(stat) {
    const transaction = this.db.transaction(['errorStats'], 'readwrite');
    const store = transaction.objectStore('errorStats');
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...stat,
        timestamp: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getErrorStats(errorType = null) {
    const transaction = this.db.transaction(['errorStats'], 'readonly');
    const store = transaction.objectStore('errorStats');
    
    if (errorType) {
      const index = store.index('errorType');
      return new Promise((resolve, reject) => {
        const request = index.getAll(errorType);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Полная очистка базы данных (для разработки)
  async clearDatabase() {
    const stores = ['protocols', 'images', 'trainingData', 'correctionRules', 'errorStats'];
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

export default new VerificationDatabase();
