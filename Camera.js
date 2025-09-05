let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;
let hasPermission = false;

// Функція для показу статусу
function showStatus(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    let statusEl = document.getElementById('camera-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'camera-status';
        statusEl.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 1000;
            max-width: 80%;
            text-align: center;
        `;
        document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = message;
    statusEl.style.background = type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff';
    
    if (type !== 'error') {
        setTimeout(() => {
            if (statusEl.parentNode) {
                statusEl.remove();
            }
        }, 3000);
    }
}

// Створення кнопки запиту дозволу
function createPermissionButton() {
    const permissionBtn = document.createElement('button');
    permissionBtn.id = 'permission-btn';
    permissionBtn.textContent = 'Дозволити доступ до камери';
    permissionBtn.style.cssText = `
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
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    permissionBtn.onclick = requestCameraPermission;
    document.body.appendChild(permissionBtn);
    
    return permissionBtn;
}

// Запит дозволу до камери
async function requestCameraPermission() {
    const permissionBtn = document.getElementById('permission-btn');
    if (permissionBtn) {
        permissionBtn.textContent = 'Запитуємо дозвіл...';
        permissionBtn.disabled = true;
    }
    
    showStatus('Запитуємо дозвіл на доступ до камери...', 'info');
    
    try {
        // Спочатку запитуємо базовий доступ
        const testStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
        });
        
        // Одразу зупиняємо тестовий потік
        testStream.getTracks().forEach(track => track.stop());
        
        hasPermission = true;
        showStatus('Дозвіл отримано!', 'success');
        
        // Прибираємо кнопку дозволу
        if (permissionBtn) {
            permissionBtn.remove();
        }
        
        // Запускаємо камеру
        setTimeout(() => {
            startCamera();
        }, 500);
        
    } catch (error) {
        console.error('Permission denied:', error);
        hasPermission = false;
        
        let errorMessage = 'Доступ до камери відхилено';
        let instructions = 'Перевірте налаштування браузера';
        
        switch (error.name) {
            case 'NotAllowedError':
                errorMessage = 'Доступ до камери заборонено';
                instructions = '1. Натисніть на іконку замка в адресному рядку\n2. Дозвольте доступ до камери\n3. Оновіть сторінку';
                break;
            case 'NotFoundError':
                errorMessage = 'Камера не знайдена';
                instructions = 'Перевірте підключення камери';
                break;
            case 'NotSupportedError':
                errorMessage = 'Камера не підтримується';
                instructions = 'Спробуйте відкрити в Safari';
                break;
        }
        
        showStatus(errorMessage, 'error');
        
        if (permissionBtn) {
            permissionBtn.textContent = 'Спробувати ще раз';
            permissionBtn.disabled = false;
        }
        
        // Показуємо детальні інструкції
        setTimeout(() => {
            alert(`${errorMessage}\n\n${instructions}`);
        }, 1000);
    }
}

// Запуск камери (після отримання дозволу)
async function startCamera() {
    if (!hasPermission) {
        showStatus('Спочатку потрібен дозвіл до камери', 'error');
        return false;
    }
    
    showStatus('Запускаємо камеру...', 'info');
    
    // Налаштування відео ПЕРЕД getUserMedia
    video.setAttribute('autoplay', 'true');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    
    // Спроби з різними налаштуваннями
    const attempts = [
        {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 24, max: 30 }
            }
        },
        {
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        {
            video: true
        }
    ];
    
    for (let i = 0; i < attempts.length; i++) {
        try {
            showStatus(`Спроба ${i + 1}/${attempts.length}...`, 'info');
            
            stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
            video.srcObject = stream;
            
            // Чекаємо готовність відео
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video timeout'));
                }, 10000);
                
                const onReady = () => {
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                
                video.addEventListener('loadedmetadata', onReady, { once: true });
                video.addEventListener('loadeddata', onReady, { once: true });
                
                // Примусовий запуск відтворення
                video.play().catch(console.warn);
                
                // Перевіряємо стан відразу
                if (video.videoWidth > 0) {
                    clearTimeout(timeout);
                    resolve();
                }
            });
            
            // Успіх!
            const width = video.videoWidth;
            const height = video.videoHeight;
            const cameraType = attempts[i].video?.facingMode === 'user' ? 'фронтальна' : 'задня';
            
            showStatus(`Камера готова! ${width}x${height} (${cameraType})`, 'success');
            console.log('Camera started:', { width, height, attempt: i + 1 });
            
            // Активуємо кнопку фото
            if (captureBtn) {
                captureBtn.disabled = false;
            }
            
            return true;
            
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
        }
    }
    
    showStatus('Не вдалося запустити камеру', 'error');
    return false;
}

// Захоплення фото
async function capturePhoto() {
    if (isProcessing) {
        showStatus('Обробка триває...', 'warning');
        return;
    }
    
    if (!stream || !video.videoWidth) {
        showStatus('Камера не готова', 'error');
        return;
    }
    
    try {
        isProcessing = true;
        captureBtn.disabled = true;
        
        showStatus('Захоплення фото...', 'info');
        
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, width, height);
        
        console.log('Photo captured:', { width, height });
        
        // Запуск OCR
        if (typeof ocrProcessor !== 'undefined') {
            showStatus('Розпізнавання тексту...', 'info');
            await ocrProcessor.processImage(canvas);
        } else {
            showStatus('OCR не доступний', 'error');
        }
        
    } catch (error) {
        console.error('Capture error:', error);
        showStatus('Помилка захоплення', 'error');
    } finally {
        isProcessing = false;
        if (captureBtn) {
            captureBtn.disabled = false;
        }
    }
}

// Зупинка камери
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        console.log('Camera stopped');
    }
}

// Перевірка підтримки
function checkSupport() {
    const checks = {
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
        https: location.protocol === 'https:' || location.hostname === 'localhost',
        safari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    };
    
    console.log('Support check:', checks);
    
    if (!checks.mediaDevices || !checks.getUserMedia) {
        showStatus('Браузер не підтримує доступ до камери', 'error');
        return false;
    }
    
    if (!checks.https) {
        showStatus('Потрібен HTTPS для роботи камери', 'error');
        return false;
    }
    
    return true;
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== APP INITIALIZATION ===');
    console.log('User Agent:', navigator.userAgent);
    
    // Перевіряємо підтримку
    if (!checkSupport()) {
        return;
    }
    
    // Блокуємо кнопку фото до запуску камери
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    // Створюємо кнопку запиту дозволу
    createPermissionButton();
    
    // Показуємо інструкції
    showStatus('Натисніть кнопку для доступу до камери', 'info');
    
    // Клавіатурні скорочення
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && !captureBtn?.disabled) {
            e.preventDefault();
            capturePhoto();
        }
        if (e.key === 'Escape') {
            if (typeof ocrProcessor !== 'undefined') {
                ocrProcessor.reset();
            }
        }
    });
    
    console.log('App ready - waiting for permission');
});

// Обробка видимості сторінки
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden');
    } else {
        console.log('Page visible');
        // Перевіряємо чи камера все ще працює
        if (hasPermission && (!stream || video.videoWidth === 0)) {
            setTimeout(startCamera, 500);
        }
    }
});
