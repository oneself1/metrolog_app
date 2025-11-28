import React, { useState, useEffect } from 'react';
import Database from '../../services/database';
import './ProtocolList.css';

const ProtocolList = ({ protocols, onProtocolsUpdate }) => {
  const [filteredProtocols, setFilteredProtocols] = useState(protocols);
  const [filter, setFilter] = useState({
    deviceType: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [protocolImages, setProtocolImages] = useState({});

  useEffect(() => {
    setFilteredProtocols(protocols);
    loadImagesForProtocols(protocols);
  }, [protocols]);

  const loadImagesForProtocols = async (protocolsList) => {
    const imagesMap = {};
    
    for (const protocol of protocolsList) {
      try {
        const images = await Database.getImagesByProtocol(protocol.id);
        if (images && images.length > 0) {
          imagesMap[protocol.id] = images[0];
        }
      } catch (error) {
        console.error(`Failed to load images for protocol ${protocol.id}:`, error);
      }
    }
    
    setProtocolImages(imagesMap);
  };

  const handleFilterChange = (field, value) => {
    const newFilter = { ...filter, [field]: value };
    setFilter(newFilter);
    applyFilters(newFilter);
  };

  const applyFilters = (filterConfig) => {
    let filtered = protocols;

    if (filterConfig.deviceType) {
      filtered = filtered.filter(p => p.deviceType === filterConfig.deviceType);
    }

    if (filterConfig.status) {
      filtered = filtered.filter(p => p.status === filterConfig.status);
    }

    if (filterConfig.dateFrom) {
      filtered = filtered.filter(p => new Date(p.date) >= new Date(filterConfig.dateFrom));
    }

    if (filterConfig.dateTo) {
      filtered = filtered.filter(p => new Date(p.date) <= new Date(filterConfig.dateTo));
    }

    setFilteredProtocols(filtered);
  };

  const handleDeleteProtocol = async (protocolId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот протокол?')) {
      try {
        await Database.deleteProtocol(protocolId);
        if (onProtocolsUpdate) {
          onProtocolsUpdate();
        }
      } catch (error) {
        console.error('Failed to delete protocol:', error);
        alert('Ошибка при удалении протокола');
      }
    }
  };

  const handleViewDetails = (protocol) => {
    setSelectedProtocol(protocol);
  };

  const handleCloseDetails = () => {
    setSelectedProtocol(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Черновик', color: '#f39c12' },
      completed: { label: 'Завершен', color: '#27ae60' },
      approved: { label: 'Утвержден', color: '#2980b9' }
    };

    const config = statusConfig[status] || { label: status, color: '#95a5a6' };
    
    return (
      <span 
        className="status-badge"
        style={{ backgroundColor: config.color }}
      >
        {config.label}
      </span>
    );
  };

  const getDeviceTypeIcon = (type) => {
    const icons = {
      gas: '🔥',
      water: '💧',
      electricity: '⚡',
      heat: '🌡️'
    };
    
    return icons[type] || '📊';
  };

  const exportProtocol = (protocol) => {
    const data = {
      ...protocol,
      images: protocolImages[protocol.id] || null
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `protocol_${protocol.id}_${protocol.date}.json`;
    link.click();
  };

  const clearFilters = () => {
    setFilter({
      deviceType: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
    setFilteredProtocols(protocols);
  };

  return (
    <div className="protocol-list component-card">
      <div className="protocol-list-header">
        <h2>📊 История протоколов</h2>
        <div className="protocol-stats">
          Всего: {protocols.length} | Показано: {filteredProtocols.length}
        </div>
      </div>

      {/* Фильтры */}
      <div className="filters-section">
        <h3>Фильтры</h3>
        <div className="filters-grid">
          <div className="form-group">
            <label>Тип прибора:</label>
            <select 
              value={filter.deviceType}
              onChange={(e) => handleFilterChange('deviceType', e.target.value)}
            >
              <option value="">Все типы</option>
              <option value="gas">Газовый счетчик</option>
              <option value="water">Водяной счетчик</option>
              <option value="electricity">Электросчетчик</option>
              <option value="heat">Теплосчетчик</option>
            </select>
          </div>

          <div className="form-group">
            <label>Статус:</label>
            <select 
              value={filter.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="completed">Завершен</option>
              <option value="approved">Утвержден</option>
            </select>
          </div>

          <div className="form-group">
            <label>Дата от:</label>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Дата до:</label>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>
        
        <button 
          className="button clear-filters-button"
          onClick={clearFilters}
        >
          🗑️ Очистить фильтры
        </button>
      </div>

      {/* Список протоколов */}
      <div className="protocols-container">
        {filteredProtocols.length === 0 ? (
          <div className="empty-state">
            <h3>📝 Протоколы не найдены</h3>
            <p>Измените параметры фильтра или создайте новый протокол</p>
          </div>
        ) : (
          <div className="protocols-grid">
            {filteredProtocols.map(protocol => (
              <div key={protocol.id} className="protocol-card">
                <div className="protocol-card-header">
                  <div className="protocol-icon">
                    {getDeviceTypeIcon(protocol.deviceType)}
                  </div>
                  <div className="protocol-info">
                    <h4>{protocol.deviceModel}</h4>
                    <p className="protocol-serial">№ {protocol.serialNumber}</p>
                  </div>
                  {getStatusBadge(protocol.status)}
                </div>

                <div className="protocol-card-body">
                  <div className="protocol-reading">
                    <span className="reading-label">Показания:</span>
                    <span className="reading-value">{protocol.initialReading}</span>
                  </div>
                  
                  <div className="protocol-meta">
                    <div className="meta-item">
                      <span className="meta-label">Дата:</span>
                      <span className="meta-value">
                        {new Date(protocol.date).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Поверитель:</span>
                      <span className="meta-value">{protocol.inspector}</span>
                    </div>
                  </div>
                </div>

                <div className="protocol-card-actions">
                  <button 
                    className="button action-button view-button"
                    onClick={() => handleViewDetails(protocol)}
                  >
                    👁️ Просмотр
                  </button>
                  
                  <button 
                    className="button action-button export-button"
                    onClick={() => exportProtocol(protocol)}
                  >
                    📤 Экспорт
                  </button>
                  
                  <button 
                    className="button action-button delete-button"
                    onClick={() => handleDeleteProtocol(protocol.id)}
                  >
                    🗑️ Удалить
                  </button>
                </div>

                {protocolImages[protocol.id] && (
                  <div className="protocol-image-preview">
                    <img 
                      src={protocolImages[protocol.id].imageData} 
                      alt="Счетчик" 
                      className="preview-thumbnail"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно деталей протокола */}
      {selectedProtocol && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Детали протокола</h2>
              <button className="close-button" onClick={handleCloseDetails}>
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="protocol-details">
                <div className="detail-row">
                  <span className="detail-label">Тип прибора:</span>
                  <span className="detail-value">
                    {getDeviceTypeIcon(selectedProtocol.deviceType)} 
                    {selectedProtocol.deviceType}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Модель:</span>
                  <span className="detail-value">{selectedProtocol.deviceModel}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Заводской номер:</span>
                  <span className="detail-value">{selectedProtocol.serialNumber}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Показания:</span>
                  <span className="detail-value reading-highlight">
                    {selectedProtocol.initialReading}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Дата поверки:</span>
                  <span className="detail-value">
                    {new Date(selectedProtocol.verificationDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Поверитель:</span>
                  <span className="detail-value">{selectedProtocol.inspector}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Статус:</span>
                  <span className="detail-value">
                    {getStatusBadge(selectedProtocol.status)}
                  </span>
                </div>
                
                {selectedProtocol.notes && (
                  <div className="detail-row full-width">
                    <span className="detail-label">Примечания:</span>
                    <span className="detail-value notes-text">
                      {selectedProtocol.notes}
                    </span>
                  </div>
                )}
              </div>

              {protocolImages[selectedProtocol.id] && (
                <div className="detail-image">
                  <h4>Изображение счетчика:</h4>
                  <img 
                    src={protocolImages[selectedProtocol.id].imageData} 
                    alt="Счетчик" 
                    className="detail-image-preview"
                  />
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                className="button export-button"
                onClick={() => exportProtocol(selectedProtocol)}
              >
                📤 Экспорт в JSON
              </button>
              <button 
                className="button close-modal-button"
                onClick={handleCloseDetails}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolList;
