let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;

// Детекція Safari та iOS
function getBrowserInfo() {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
    const isWebView = isIOS && !isSafari;
    
    // Детекція версії iOS
    let iOSVersion = null;
    if (isIOS) {
        const match = userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
            iOSVersion = parseFloat(match[1] + '.' + match[2]);
        }
    }
    
    console.log('Browser info:', { isIOS, isSafari, isWebView, iOSVersion, userAgent });
    return { isIOS, isSafari, isWebView, iOSVersion };
}

// Створення статус індикатора
function showStatus(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    let statusEl = document.getElementById('status-indicator');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'status-indicator';
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
    
    // Автоматично прибрати через 5 секунд (крім помилок)
    if (type !== 'error') {
        setTimeout(() => {
            if (statusEl.parentNode) {
                statusEl.remove();
            }
        }, 5000);
    }
}

// Запуск камери з врахуванням особливостей Safari
async function startCamera() {
    const browserInfo = getBrowserInfo();
    
    // Перевірка підтримки
    if (!navigator.mediaDevices) {
        showStatus('MediaDevices API не підтримується', 'error');
        return false;
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
        showStatus('getUserMedia не підтримується', 'error');
        return false;
    }
    
    // Перевірка HTTPS (критично для iOS)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        showStatus('Потрібен HTTPS для роботи камери на iOS', 'error');
        return false;
    }
    
    // Попередження для WebView
    if (browserInfo.isWebView) {
        showStatus('Рекомендується відкрити в Safari', 'warning');
    }
    
    showStatus('Запускаємо камеру...', 'info');
    
    // Специфічні налаштування для Safari iOS
    const constraints = {
        audio: false, // Важливо: не запитуємо аудіо
        video: {
            // Не використовуємо exact - Safari це не любить
            facingMode: 'environment', // Задня камера
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            frameRate: { min: 15, ideal: 24, max: 30 }
        }
    };
    
    try {
        // КРИТИЧНО: Налаштовуємо відео ПЕРЕД getUserMedia
        video.setAttribute('autoplay', 'true');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true; // Обов'язково для автовідтворення
        
        // Запит дозволу з таймаутом
        const permissionPromise = navigator.mediaDevices.getUserMedia(constraints);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 15000)
        );
        
        stream = await Promise.race([permissionPromise, timeoutPromise]);
        
        if (!stream) {
            throw new Error('No stream received');
        }
        
        console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, label: t.label })));
        
        // Встановлюємо srcObject
        video.srcObject = stream;
        
        // Чекаємо готовність відео
        await waitForVideoReady();
        
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        if (width === 0 || height === 0) {
            throw new Error('Video dimensions are zero');
        }
        
        showStatus(`Камера готова! ${width}x${height}`, 'success');
        console.log('Camera started successfully:', { width, height });
        
        return true;
        
    } catch (error) {
        console.error('Camera start error:', error);
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        // Спробуємо fallback до фронтальної камери
        if (constraints.video.facingMode === 'environment') {
            console.log('Trying front camera fallback...');
            return await startCameraFallback();
        }
        
        handleCameraError(error);
        return false;
    }
}

// Fallback до фронтальної камери
async function startCameraFallback() {
    showStatus('Пробуємо фронтальну камеру...', 'info');
    
    const fallbackConstraints = {
        audio: false,
        video: {
            facingMode: 'user', // Фронтальна камера
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
        }
    };
    
    try {
        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        video.srcObject = stream;
        
        await waitForVideoReady();
        
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        if (width > 0 && height > 0) {
            showStatus(`Фронтальна камера готова! ${width}x${height}`, 'success');
            return true;
        } else {
            throw new Error('Front camera dimensions zero');
        }
        
    } catch (error) {
        console.error('Front camera fallback failed:', error);
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        // Останній fallback - базові налаштування
        return await startCameraBasic();
    }
}

// Базовий fallback
async function startCameraBasic() {
    showStatus('Останній fallback...', 'info');
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        
        await waitForVideoReady();
        
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        if (width > 0 && height > 0) {
            showStatus(`Базова камера готова! ${width}x${height}`, 'success');
            return true;
        } else {
            throw new Error('Basic camera failed');
        }
        
    } catch (error) {
        console.error('All camera attempts failed:', error);
        handleCameraError(error);
        return false;
    }
}

// Чекання готовності відео
function waitForVideoReady() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Video ready timeout'));
        }, 10000);
        
        const checkReady = () => {
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                clearTimeout(timeout);
                resolve();
            }
        };
        
        // Перевіряємо різні події
        video.addEventListener('loadedmetadata', checkReady, { once: true });
        video.addEventListener('loadeddata', checkReady, { once: true });
        video.addEventListener('canplay', checkReady, { once: true });
        
        // Примусовий запуск відтворення для Safari
        video.play().catch(err => {
            console.log('Video play error (might be normal):', err);
        });
        
        // Перевіряємо стан відразу
        if (video.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
        }
    });
}

// Обробка помилок камери
function handleCameraError(error) {
    let message = 'Помилка камери: ';
    let instructions = '';
    
    switch (error.name) {
        case 'NotAllowedError':
            message += 'Доступ заборонений';
            instructions = 'Дозвольте доступ до камери:\n1. Safari → Налаштування сайту → Камера → Дозволити\n2. Оновіть сторінку';
            break;
        case 'NotFoundError':
            message += 'Камера не знайдена';
            instructions = 'Перевірте, чи камера не використовується іншим додатком';
            break;
        case 'NotSupportedError':
            message += 'Не підтримується браузером';
            instructions = 'Використовуйте Safari замість іншого браузера';
            break;
        case 'NotReadableError':
            message += 'Камера недоступна';
            instructions = 'Закрийте інші додатки і спробуйте знову';
            break;
        case 'OverconstrainedError':
            message += 'Налаштування не підтримуються';
            instructions = 'Перезавантажте сторінку';
            break;
        case 'AbortError':
            message += 'Операція перервана';
            instructions = 'Спробуйте ще раз';
            break;
        default:
            message += error.message || 'Невідома помилка';
            instructions = 'Спробуйте перезавантажити сторінку або відкрити в Safari';
    }
    
    showStatus(message, 'error');
    
    // Показуємо детальні інструкції
    setTimeout(() => {
        alert(message + '\n\n' + instructions);
    }, 1000);
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
        captureBtn.disabled = false;
    }
}

// Зупинка камери
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind);
        });
        stream = null;
        video.srcObject = null;
        showStatus('Камера зупинена', 'info');
    }
}

// Обробка видимості сторінки
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden');
        // Не зупиняємо камеру одразу - може бути тимчасово
        setTimeout(() => {
            if (document.hidden) {
                stopCamera();
            }
        }, 5000);
    } else {
        console.log('Page visible');
        if (!stream) {
            setTimeout(startCamera, 500);
        }
    }
});

// Обробка зміни орієнтації
window.addEventListener('orientationchange', () => {
    console.log('Orientation changed');
    // Затримка для стабілізації
    setTimeout(() => {
        if (stream && video.videoWidth === 0) {
            console.log('Restarting camera after orientation change');
            stopCamera();
            setTimeout(startCamera, 1000);
        }
    }, 1000);
});

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== APP INITIALIZATION ===');
    
    const browserInfo = getBrowserInfo();
    console.log('Browser detected:', browserInfo);
    
    // Додаємо кнопку діагностики
    const diagBtn = document.createElement('button');
    diagBtn.textContent = '🔧';
    diagBtn.title = 'Діагностика';
    diagBtn.style.cssText = `
        position: fixed;
        top: 24px;
        right: 80px;
        width: 40px;
        height: 40px;
        border-radius: 20px;
        border: none;
        background: rgba(255,255,255,0.9);
        font-size: 16px;
        z-index: 1000;
        cursor: pointer;
    `;
    diagBtn.onclick = async () => {
        const info = getBrowserInfo();
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        alert(`Browser: ${info.isSafari ? 'Safari' : 'Other'}\niOS: ${info.iOSVersion || 'No'}\nCameras: ${cameras.length}\nHTTPS: ${location.protocol === 'https:'}`);
    };
    document.body.appendChild(diagBtn);
    
    // Запуск камери з затримкою для iOS
    setTimeout(() => {
        startCamera();
    }, browserInfo.isIOS ? 1500 : 500);
    
    // Обробники подій
    if (captureBtn) {
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    // Клавіатурні скорочення
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            e.preventDefault();
            capturePhoto();
        }
        if (e.key === 'Escape') {
            if (typeof ocrProcessor !== 'undefined') {
                ocrProcessor.reset();
            }
        }
    });
    
    console.log('App ready');
});
