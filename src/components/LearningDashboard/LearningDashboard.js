import React, { useState, useEffect } from 'react';
import ActiveLearningService from '../../services/activeLearningService';
import Database from '../../services/database';
import './LearningDashboard.css';

const LearningDashboard = () => {
  const [stats, setStats] = useState(null);
  const [rules, setRules] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [trainingData, setTrainingData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, rulesData, patternsData, trainingData] = await Promise.all([
        ActiveLearningService.getLearningStatistics(),
        ActiveLearningService.getCorrectionRules(),
        ActiveLearningService.getMistakePatterns(),
        Database.getTrainingData()
      ]);

      setStats(statsData);
      setRules(rulesData);
      setPatterns(patternsData);
      setTrainingData(trainingData);
    } catch (error) {
      console.error('Failed to load learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = async () => {
    if (window.confirm('Вы уверены, что хотите очистить все данные обучения? Это действие нельзя отменить.')) {
      try {
        await Database.clearDatabase();
        await loadData();
        alert('Данные обучения успешно очищены');
      } catch (error) {
        console.error('Failed to clear learning data:', error);
        alert('Ошибка при очистке данных');
      }
    }
  };

  const getEffectivenessColor = (effectiveness) => {
    if (effectiveness >= 0.8) return '#27ae60';
    if (effectiveness >= 0.6) return '#f39c12';
    return '#e74c3c';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#27ae60';
    if (confidence >= 0.6) return '#f39c12';
    return '#e74c3c';
  };

  if (loading) {
    return (
      <div className="learning-dashboard component-card">
        <div className="loading-state">
          <div className="loading"></div>
          <p>Загрузка данных обучения...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="learning-dashboard component-card">
      <div className="dashboard-header">
        <h2>🧠 Панель обучения системы</h2>
        <button 
          className="button danger-button"
          onClick={handleClearData}
          title="Очистить все данные обучения"
        >
          🗑️ Очистить данные
        </button>
      </div>

      <nav className="dashboard-nav">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          📊 Обзор
        </button>
        <button 
          className={activeTab === 'rules' ? 'active' : ''}
          onClick={() => setActiveTab('rules')}
        >
          📝 Правила
        </button>
        <button 
          className={activeTab === 'patterns' ? 'active' : ''}
          onClick={() => setActiveTab('patterns')}
        >
          🔍 Паттерны
        </button>
        <button 
          className={activeTab === 'training' ? 'active' : ''}
          onClick={() => setActiveTab('training')}
        >
          🎓 Обучение
        </button>
      </nav>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {stats && (
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-value">{stats.trainingExamples}</div>
                  <div className="stat-label">Примеров обучения</div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon">📝</div>
                  <div className="stat-value">{stats.rulesCount}</div>
                  <div className="stat-label">Правил коррекции</div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon">🔍</div>
                  <div className="stat-value">{stats.mistakePatterns}</div>
                  <div className="stat-label">Паттернов ошибок</div>
                </div>
                <div className="stat-card info">
                  <div className="stat-icon">📈</div>
                  <div className="stat-value">{stats.successRate.toFixed(1)}%</div>
                  <div className="stat-label">Эффективность</div>
                </div>
              </div>
            )}

            <div className="system-health">
              <h3>Состояние системы</h3>
              <div className="health-indicators">
                <div className="health-indicator">
                  <span className="indicator-label">База данных:</span>
                  <span className="indicator-value healthy">✅ Работает</span>
                </div>
                <div className="health-indicator">
                  <span className="indicator-label">OCR сервис:</span>
                  <span className="indicator-value healthy">✅ Активен</span>
                </div>
                <div className="health-indicator">
                  <span className="indicator-label">Обучение:</span>
                  <span className="indicator-value healthy">✅ Активно</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="rules-tab">
            <h3>Активные правила коррекции</h3>
            
            {rules.length === 0 ? (
              <div className="empty-state">
                <p>Правила коррекции еще не созданы</p>
                <small>Система создаст правила после накопления достаточного количества примеров обучения</small>
              </div>
            ) : (
              <div className="rules-list">
                {rules.map(rule => (
                  <div key={rule.pattern} className="rule-card">
                    <div className="rule-header">
                      <div className="rule-pattern">
                        <strong>{rule.from}</strong>
                        <span className="rule-arrow">→</span>
                        <strong>{rule.to}</strong>
                      </div>
                      <div 
                        className="rule-effectiveness"
                        style={{ color: getEffectivenessColor(rule.effectiveness) }}
                      >
                        {Math.round(rule.effectiveness * 100)}%
                      </div>
                    </div>
                    
                    <div className="rule-details">
                      <div className="rule-meta">
                        <span className="meta-item">
                          <span className="meta-label">Тип:</span>
                          <span className="meta-value">{rule.type}</span>
                        </span>
                        <span className="meta-item">
                          <span className="meta-label">Использовано:</span>
                          <span className="meta-value">{rule.usageCount} раз</span>
                        </span>
                        <span className="meta-item">
                          <span className="meta-label">Успешно:</span>
                          <span className="meta-value">{rule.successCount} раз</span>
                        </span>
                      </div>
                      
                      {rule.conditions && rule.conditions.deviceTypes.length > 0 && (
                        <div className="rule-conditions">
                          <span className="conditions-label">Применяется для:</span>
                          <span className="conditions-value">
                            {rule.conditions.deviceTypes.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="rule-created">
                      Создано: {new Date(rule.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="patterns-tab">
            <h3>Выявленные паттерны ошибок</h3>
            
            {patterns.length === 0 ? (
              <div className="empty-state">
                <p>Паттерны ошибок еще не выявлены</p>
                <small>Система начнет выявлять паттерны после обработки пользовательских исправлений</small>
              </div>
            ) : (
              <div className="patterns-list">
                {patterns.slice(0, 20).map((pattern, index) => (
                  <div key={index} className="pattern-card">
                    <div className="pattern-header">
                      <div className="pattern-key">{pattern.patternKey}</div>
                      <div className="pattern-count">{pattern.count} случаев</div>
                    </div>
                    
                    <div className="pattern-stats">
                      <div className="pattern-stat">
                        <span className="stat-label">Средняя уверенность:</span>
                        <span 
                          className="stat-value"
                          style={{ color: getConfidenceColor(pattern.confidenceSum / pattern.count) }}
                        >
                          {((pattern.confidenceSum / pattern.count) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="pattern-stat">
                        <span className="stat-label">Первый раз:</span>
                        <span className="stat-value">
                          {new Date(pattern.firstSeen).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div className="pattern-stat">
                        <span className="stat-label">Последний раз:</span>
                        <span className="stat-value">
                          {new Date(pattern.lastSeen).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                    
                    {pattern.contexts && pattern.contexts.length > 0 && (
                      <div className="pattern-contexts">
                        <span className="contexts-label">Контексты:</span>
                        <span className="contexts-value">
                          {[...new Set(pattern.contexts.map(c => c.deviceType).filter(Boolean))].join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'training' && (
          <div className="training-tab">
            <h3>Данные обучения</h3>
            
            {trainingData.length === 0 ? (
              <div className="empty-state">
                <p>Данные обучения отсутствуют</p>
                <small>Данные появятся после пользовательских исправлений распознавания</small>
              </div>
            ) : (
              <div className="training-data">
                <div className="training-stats">
                  <p>Всего примеров: {trainingData.length}</p>
                </div>
                
                <div className="training-list">
                  {trainingData.slice(0, 10).map((item, index) => (
                    <div key={index} className="training-item">
                      <div className="training-correction">
                        <span className="correction-from">{item.original.processedValue}</span>
                        <span className="correction-arrow">→</span>
                        <span className="correction-to">{item.corrected}</span>
                      </div>
                      
                      <div className="training-meta">
                        <span className="meta-item">
                          <span className="meta-label">Тип:</span>
                          <span className="meta-value">{item.patternType}</span>
                        </span>
                        <span className="meta-item">
                          <span className="meta-label">Уверенность:</span>
                          <span className="meta-value">{(item.confidence * 100).toFixed(1)}%</span>
                        </span>
                        <span className="meta-item">
                          <span className="meta-label">Дата:</span>
                          <span className="meta-value">
                            {new Date(item.timestamp).toLocaleDateString('ru-RU')}
                          </span>
                        </span>
                      </div>
                      
                      {item.context && item.context.deviceType && (
                        <div className="training-context">
                          <span className="context-label">Контекст:</span>
                          <span className="context-value">{item.context.deviceType}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {trainingData.length > 10 && (
                  <div className="training-more">
                    <small>Показано 10 из {trainingData.length} примеров</small>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningDashboard;
