let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;

// Логування для відладки
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1];
    console.log(`[${timestamp}] ${message}`, data || '');
}

// Показ статусу
function showStatus(message, type = 'info') {
    debugLog(`STATUS (${type}): ${message}`);
    
    let statusEl = document.getElementById('status-display');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'status-display';
        statusEl.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff3333' : type === 'success' ? '#33ff33' : '#3333ff'};
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 1000;
            text-align: center;
            font-family: monospace;
        `;
        document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = message;
    statusEl.style.background = type === 'error' ? '#ff3333' : type === 'success' ? '#33ff33' : '#3333ff';
}

// Примусовий запит дозволу
async function requestCameraPermission() {
    debugLog('=== ЗАПИТ ДОЗВОЛУ ===');
    showStatus('Запитуємо дозвіл до камери...', 'info');
    
    try {
        // Простий запит
        const testStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
        });
        
        debugLog('Дозвіл отримано, зупиняємо тестовий потік');
        testStream.getTracks().forEach(track => track.stop());
        
        showStatus('Дозвіл отримано! Запускаємо камеру...', 'success');
        
        setTimeout(() => startCamera(), 1000);
        return true;
        
    } catch (error) {
        debugLog('Помилка дозволу:', error);
        showStatus(`Помилка: ${error.name}`, 'error');
        
        let solution = '';
        switch (error.name) {
            case 'NotAllowedError':
                solution = 'Дозвольте доступ до камери в браузері (іконка замка в адресному рядку)';
                break;
            case 'NotFoundError':
                solution = 'Камера не знайдена. Перевірте підключення';
                break;
            default:
                solution = 'Спробуйте оновити сторінку або інший браузер';
        }
        
        alert(`Проблема з камерою: ${error.name}\n\nРішення: ${solution}`);
        return false;
    }
}

// Запуск камери
async function startCamera() {
    debugLog('=== ЗАПУСК КАМЕРИ ===');
    showStatus('Налаштовуємо камеру...', 'info');
    
    // Налаштування відео
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    const configs = [
        {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        },
        {
            video: true
        }
    ];
    
    for (let i = 0; i < configs.length; i++) {
        try {
            showStatus(`Спроба ${i + 1}/${configs.length}...`, 'info');
            debugLog(`Config ${i + 1}:`, configs[i]);
            
            stream = await navigator.mediaDevices.getUserMedia(configs[i]);
            video.srcObject = stream;
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
                
                const checkReady = () => {
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                
                video.addEventListener('loadedmetadata', checkReady);
                video.addEventListener('loadeddata', checkReady);
                video.play().catch(console.warn);
                
                checkReady();
            });
            
            const width = video.videoWidth;
            const height = video.videoHeight;
            
            showStatus(`Камера працює! ${width}x${height}`, 'success');
            debugLog('Камера успішно запущена:', { width, height });
            
            if (captureBtn) {
                captureBtn.disabled = false;
                captureBtn.textContent = 'Зробити фото';
            }
            
            return true;
            
        } catch (error) {
            debugLog(`Config ${i + 1} failed:`, error);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
        }
    }
    
    showStatus('Камера не запустилася', 'error');
    return false;
}

// Захоплення фото
async function capturePhoto() {
    if (isProcessing || !stream || !video.videoWidth) {
        showStatus('Камера не готова', 'error');
        return;
    }
    
    try {
        isProcessing = true;
        captureBtn.disabled = true;
        captureBtn.textContent = 'Обробка...';
        
        showStatus('Захоплення фото...', 'info');
        
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, width, height);
        
        debugLog('Фото захоплено:', { width, height });
        
        if (typeof ocrProcessor !== 'undefined') {
            showStatus('Розпізнавання тексту...', 'info');
            await ocrProcessor.processImage(canvas);
        } else {
            showStatus('OCR недоступний', 'error');
        }
        
    } catch (error) {
        debugLog('Capture error:', error);
        showStatus('Помилка захоплення', 'error');
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
        captureBtn.textContent = 'Зробити фото';
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    debugLog('=== ІНІЦІАЛІЗАЦІЯ ===');
    debugLog('User Agent:', navigator.userAgent);
    
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.textContent = 'Очікування...';
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    // Перевірка підтримки
    if (!navigator.mediaDevices?.getUserMedia) {
        showStatus('Браузер не підтримує камеру', 'error');
        return;
    }
    
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        showStatus('Потрібен HTTPS для камери', 'error');
        return;
    }
    
    // Створюємо кнопку запуску
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Запустити камеру';
    startBtn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #01F55F;
        color: black;
        border: none;
        border-radius: 25px;
        padding: 16px 32px;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        z-index: 1001;
    `;
    startBtn.onclick = () => {
        startBtn.remove();
        requestCameraPermission();
    };
    
    document.body.appendChild(startBtn);
    
    debugLog('Готово до запуску');
});
