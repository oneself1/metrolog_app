import React, { useState, useEffect, useRef } from 'react';
import Database from '../../services/database';
import AdaptiveOCRService from '../../services/adaptiveOCRService';
import './ProtocolEditor.css';

const ProtocolEditor = ({ imageData, recognitionResult, context, onProtocolSaved }) => {
  const [protocol, setProtocol] = useState({
    deviceType: '',
    deviceModel: '',
    serialNumber: '',
    initialReading: '',
    finalReading: '',
    verificationDate: new Date().toISOString().split('T')[0],
    inspector: '',
    notes: '',
    status: 'draft'
  });

  const [originalRecognition, setOriginalRecognition] = useState(null);
  const [wasCorrected, setWasCorrected] = useState(false);
  const [saved, setSaved] = useState(false);
  const [learningStats, setLearningStats] = useState(null);
  const previousReadingRef = useRef('');

  useEffect(() => {
    if (recognitionResult) {
      setOriginalRecognition(recognitionResult);
      const initialValue = recognitionResult.processedValue || '';
      setProtocol(prev => ({
        ...prev,
        initialReading: initialValue,
        deviceType: context.deviceType || prev.deviceType
      }));
      previousReadingRef.current = initialValue;
      
      loadLearningStats();
    }
  }, [recognitionResult, context]);

  useEffect(() => {
    if (context.deviceType) {
      setProtocol(prev => ({
        ...prev,
        deviceType: context.deviceType
      }));
    }
  }, [context.deviceType]);

  const loadLearningStats = async () => {
    try {
      const stats = await AdaptiveOCRService.getLearningStatistics();
      setLearningStats(stats);
    } catch (error) {
      console.error('Failed to load learning stats:', error);
    }
  };

  const handleInputChange = (field, value) => {
    const previousValue = protocol[field];
    setProtocol(prev => ({ ...prev, [field]: value }));

    // Если пользователь исправил автоматически распознанное значение
    if (field === 'initialReading' && originalRecognition && value !== previousValue) {
      handleUserCorrection(value);
    }
  };

  const handleUserCorrection = (correctedValue) => {
    if (!originalRecognition) return;

    // Регистрируем исправление для обучения
    AdaptiveOCRService.registerUserCorrection(
      originalRecognition,
      correctedValue,
      {
        deviceType: protocol.deviceType,
        deviceModel: protocol.deviceModel,
        ...context
      }
    );

    setWasCorrected(true);
    setTimeout(() => setWasCorrected(false), 3000);
    loadLearningStats();
  };

  const handleSave = async () => {
    try {
      const protocolId = await Database.saveProtocol(protocol);
      
      if (imageData && originalRecognition) {
        await Database.saveImage(protocolId, imageData, originalRecognition);
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      if (onProtocolSaved) {
        onProtocolSaved();
      }

      // Сбрасываем форму после сохранения
      setTimeout(() => {
        setProtocol({
          deviceType: '',
          deviceModel: '',
          serialNumber: '',
          initialReading: '',
          finalReading: '',
          verificationDate: new Date().toISOString().split('T')[0],
          inspector: '',
          notes: '',
          status: 'draft'
        });
        setOriginalRecognition(null);
      }, 2000);

    } catch (error) {
      console.error('Save failed:', error);
      alert('Ошибка сохранения протокола');
    }
  };

  const getCorrectionExplanation = () => {
    if (!originalRecognition?.appliedRules?.length) return null;

    return (
      <div className="correction-explanation">
        <h4>🔄 Автоматически исправлено:</h4>
        {originalRecognition.appliedRules.map((rule, index) => (
          <div key={index} className="correction-rule">
            <span className="correction-from">{rule.from}</span>
            <span className="correction-arrow">→</span>
            <span className="correction-to">{rule.to}</span>
            <span className="rule-type">({rule.rule})</span>
          </div>
        ))}
      </div>
    );
  };

  const getRecognitionQuality = () => {
    if (!originalRecognition) return null;

    const confidence = originalRecognition.confidence || 0;
    let quality = 'низкое';
    let color = '#e74c3c';

    if (confidence > 0.8) {
      quality = 'высокое';
      color = '#27ae60';
    } else if (confidence > 0.6) {
      quality = 'среднее';
      color = '#f39c12';
    }

    return (
      <div className="recognition-quality">
        <span className="quality-label">Качество распознавания:</span>
        <span className="quality-value" style={{ color }}>
          {quality} ({(confidence * 100).toFixed(1)}%)
        </span>
      </div>
    );
  };

  const isFormValid = () => {
    return protocol.deviceType && 
           protocol.deviceModel && 
           protocol.serialNumber && 
           protocol.initialReading && 
           protocol.inspector;
  };

  return (
    <div className="protocol-editor component-card">
      <div className="editor-header">
        <h2>📝 Протокол поверки</h2>
        {learningStats && (
          <div className="learning-stats">
            <small>
              🧠 Система обучена на {learningStats.trainingExamples} примерах
            </small>
          </div>
        )}
      </div>
      
      {saved && (
        <div className="success-message">
          ✅ Протокол успешно сохранен!
        </div>
      )}

      {wasCorrected && (
        <div className="correction-notification">
          ✅ Исправление сохранено для обучения системы
        </div>
      )}

      {getCorrectionExplanation()}
      
      <div className="form-grid">
        <div className="form-group">
          <label>Тип прибора *:</label>
          <select 
            value={protocol.deviceType}
            onChange={(e) => handleInputChange('deviceType', e.target.value)}
            required
          >
            <option value="">Выберите тип</option>
            <option value="gas">Газовый счетчик</option>
            <option value="water">Водяной счетчик</option>
            <option value="electricity">Электросчетчик</option>
            <option value="heat">Теплосчетчик</option>
          </select>
        </div>

        <div className="form-group">
          <label>Модель прибора *:</label>
          <input
            type="text"
            value={protocol.deviceModel}
            onChange={(e) => handleInputChange('deviceModel', e.target.value)}
            placeholder="Например: СГБМ-1,6"
            required
          />
        </div>

        <div className="form-group">
          <label>Заводской номер *:</label>
          <input
            type="text"
            value={protocol.serialNumber}
            onChange={(e) => handleInputChange('serialNumber', e.target.value)}
            placeholder="Например: 123456789"
            required
          />
        </div>

        <div className="form-group">
          <label>Начальные показания *:</label>
          <input
            type="text"
            value={protocol.initialReading}
            onChange={(e) => handleInputChange('initialReading', e.target.value)}
            placeholder="Автоматически распознано"
            className={originalRecognition?.wasCorrected ? 'auto-corrected' : ''}
            required
          />
          {originalRecognition && (
            <div className="recognition-details">
              {getRecognitionQuality()}
              {originalRecognition.originalValue && originalRecognition.wasCorrected && (
                <div className="original-value">
                  Исходное значение: <code>{originalRecognition.originalValue}</code>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Конечные показания:</label>
          <input
            type="text"
            value={protocol.finalReading}
            onChange={(e) => handleInputChange('finalReading', e.target.value)}
            placeholder="Введите после поверки"
          />
        </div>

        <div className="form-group">
          <label>Дата поверки *:</label>
          <input
            type="date"
            value={protocol.verificationDate}
            onChange={(e) => handleInputChange('verificationDate', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Поверитель *:</label>
          <input
            type="text"
            value={protocol.inspector}
            onChange={(e) => handleInputChange('inspector', e.target.value)}
            placeholder="ФИО поверителя"
            required
          />
        </div>
      </div>

      <div className="form-group full-width">
        <label>Примечания и замечания:</label>
        <textarea
          value={protocol.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows="4"
          placeholder="Дополнительная информация о поверке..."
        />
      </div>

      <div className="form-actions">
        <button 
          className="button save-button"
          onClick={handleSave}
          disabled={!isFormValid() || saved}
        >
          {saved ? '✅ Сохранено!' : '💾 Сохранить протокол'}
        </button>
        
        <div className="form-requirements">
          <small>Поля помеченные * обязательны для заполнения</small>
        </div>
      </div>

      {imageData && (
        <div className="image-preview">
          <h4>Захваченное изображение:</h4>
          <img src={imageData} alt="Захваченный счетчик" className="preview-image" />
        </div>
      )}
    </div>
  );
};

export default ProtocolEditor;
