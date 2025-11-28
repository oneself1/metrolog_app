import React, { useRef, useState, useCallback, useEffect } from 'react';
import AdaptiveOCRService from '../../services/adaptiveOCRService';
import './CameraCapture.css';

const CameraCapture = ({ onCapture, onRecognize, onContextUpdate }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [deviceType, setDeviceType] = useState('gas');

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Обновляем контекст
      onContextUpdate({ deviceType });

    } catch (error) {
      console.error('Camera error:', error);
      setError(`Не удалось получить доступ к камере: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Устанавливаем размеры canvas как у видео
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Рисуем текущий кадр видео на canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Получаем данные изображения
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      onCapture(imageData);
      
      return imageData;
    }
    return null;
  }, [onCapture]);

  const recognizeImage = async (imageData) => {
    setIsCapturing(true);
    setError(null);
    
    try {
      const context = { deviceType };
      const result = await AdaptiveOCRService.recognizeWithLearning(imageData, context);
      onRecognize(result);
    } catch (error) {
      console.error('Recognition failed:', error);
      setError(`Ошибка распознавания: ${error.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCapture = async () => {
    const image = captureImage();
    if (image) {
      await recognizeImage(image);
    }
  };

  const handleDeviceTypeChange = (type) => {
    setDeviceType(type);
    onContextUpdate({ deviceType: type });
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="camera-capture component-card">
      <h2>📷 Захват показаний счетчика</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="camera-controls">
        <div className="form-group">
          <label>Тип счетчика:</label>
          <select 
            value={deviceType}
            onChange={(e) => handleDeviceTypeChange(e.target.value)}
          >
            <option value="gas">Газовый счетчик</option>
            <option value="water">Водяной счетчик</option>
            <option value="electricity">Электросчетчик</option>
          </select>
        </div>

        {!stream ? (
          <button 
            className="button"
            onClick={startCamera}
          >
            📷 Включить камеру
          </button>
        ) : (
          <div className="camera-interface">
            <div className="camera-preview-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="camera-preview"
              />
              <div className="camera-overlay">
                <div className="focus-frame"></div>
                <p>Наведите на показания счетчика</p>
              </div>
            </div>
            
            <div className="camera-buttons">
              <button 
                className="button capture-button"
                onClick={handleCapture}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <>
                    <span className="loading"></span>
                    Распознавание...
                  </>
                ) : (
                  '📸 Сфотографировать'
                )}
              </button>
              
              <button 
                className="button stop-button"
                onClick={stopCamera}
              >
                ❌ Выключить камеру
              </button>
            </div>
          </div>
        )}
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {capturedImage && (
        <div className="captured-preview">
          <h3>Захваченное изображение:</h3>
          <div className="preview-container">
            <img src={capturedImage} alt="Captured" className="preview-image" />
            <button 
              className="button retry-button"
              onClick={handleRetry}
            >
              🔄 Сделать новый снимок
            </button>
          </div>
        </div>
      )}

      <div className="camera-tips">
        <h4>Советы для лучшего распознавания:</h4>
        <ul>
          <li>✅ Обеспечьте хорошее освещение</li>
          <li>✅ Держите камеру прямо напротив счетчика</li>
          <li>✅ Убедитесь, что цифры четко видны</li>
          <li>❌ Избегайте бликов и теней</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraCapture;
