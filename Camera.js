let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;

// Детекція iOS та версії
function getIOSInfo() {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isInAppBrowser = !isSafari && isIOS;
    
    let version = null;
    if (isIOS) {
        const match = userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
            version = parseFloat(match[1] + '.' + match[2]);
        }
    }
    
    return { isIOS, isSafari, isInAppBrowser, version };
}

// Діагностика можливостей браузера
async function checkBrowserCapabilities() {
    const iosInfo = getIOSInfo();
    console.log('=== ДІАГНОСТИКА БРАУЗЕРА ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('iOS Info:', iosInfo);
    console.log('HTTPS:', location.protocol === 'https:');
    console.log('MediaDevices available:', !!navigator.mediaDevices);
    console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
    
    // Перевіряємо доступні камери
    if (navigator.mediaDevices?.enumerateDevices) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            console.log('Available cameras:', videoDevices.length);
            videoDevices.forEach((device, index) => {
                console.log(`Camera ${index + 1}:`, device.label || `Camera ${index + 1}`, device.deviceId);
            });
        } catch (error) {
            console.error('Cannot enumerate devices:', error);
        }
    }
    
    return iosInfo;
}

// Створення статус індикатора
function createStatusIndicator() {
    let statusEl = document.getElementById('camera-status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'camera-status';
        statusEl.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(statusEl);
    }
    return statusEl;
}

// Оновлення статусу
function updateStatus(message, type = 'info') {
    const statusEl = createStatusIndicator();
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    
    // Автоматично приховати через 5 секунд, крім помилок
    if (type !== 'error') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 5000);
    }
    
    console.log(`Status (${type}):`, message);
}

// Запуск камери з прогресивними налаштуваннями
async function startCamera() {
    const iosInfo = await checkBrowserCapabilities();
    
    // Перевірка базових вимог
    if (!navigator.mediaDevices?.getUserMedia) {
        updateStatus('Браузер не підтримує доступ до камери', 'error');
        return;
    }
    
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        updateStatus('Потрібен HTTPS для доступу до камери', 'error');
        return;
    }
    
    // Попередження для in-app браузерів
    if (iosInfo.isInAppBrowser) {
        updateStatus('Спробуйте відкрити в Safari для кращої роботи камери', 'warning');
    }
    
    updateStatus('Запуск камери...', 'info');
    
    // Налаштування для різних спроб
    const attempts = [
        // Спроба 1: Висока якість для iPhone 14 Pro
        {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920, max: 3840 },
                height: { ideal: 1080, max: 2160 },
                frameRate: { ideal: 30 }
            }
        },
        // Спроба 2: Середня якість
        {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 24 }
            }
        },
        // Спроба 3: Фронтальна камера
        {
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        // Спроба 4: Базові налаштування
        {
            video: true
        }
    ];
    
    for (let i = 0; i < attempts.length; i++) {
        try {
            updateStatus(`Спроба ${i + 1}/${attempts.length}...`, 'info');
            console.log(`Attempt ${i + 1}:`, attempts[i]);
            
            // Запит дозволу
            stream = await navigator.mediaDevices.getUserMedia(attempts[i]);
            
            // Налаштування відео для iOS
            if (iosInfo.isIOS) {
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.muted = true;
                video.autoplay = true;
            }
            
            video.srcObject = stream;
            
            // Чекаємо завантаження метаданих
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video loading timeout'));
                }, 15000);
                
                video.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                
                video.addEventListener('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }, { once: true });
            });
            
            // Успіх!
            const width = video.videoWidth;
            const height = video.videoHeight;
            
            if (width > 0 && height > 0) {
                const cameraType = attempts[i].video.facingMode === 'user' ? 'фронтальна' : 'задня';
                updateStatus(`Камера готова! ${width}x${height} (${cameraType})`, 'success');
                
                console.log('=== КАМЕРА ЗАПУЩЕНА ===');
                console.log('Розміри відео:', width, 'x', height);
                console.log('Тип камери:', cameraType);
                console.log('Спроба:', i + 1);
                
                return true;
            }
            
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            
            // Показуємо специфічну помилку тільки на останній спробі
            if (i === attempts.length - 1) {
                showDetailedError(error);
            }
        }
    }
    
    updateStatus('Не вдалося запустити камеру', 'error');
    return false;
}

// Детальна інформація про помилку
function showDetailedError(error) {
    let message = 'Помилка камери: ';
    let solution = '';
    
    switch(error.name) {
        case 'NotAllowedError':
            message += 'Доступ заборонено';
            solution = 'Дозвольте доступ до камери в налаштуваннях Safari:\n1. Настройки → Safari → Камера → Разрешить\n2. Оновіть сторінку';
            break;
        case 'NotFoundError':
            message += 'Камера не знайдена';
            solution = 'Перевірте, чи не використовується камера іншим додатком';
            break;
        case 'NotSupportedError':
            message += 'Не підтримується';
            solution = 'Спробуйте відкрити в Safari замість іншого браузера';
            break;
        case 'NotReadableError':
            message += 'Камера недоступна';
            solution = 'Закрийте інші додатки що використовують камеру та спробуйте знову';
            break;
        case 'OverconstrainedError':
            message += 'Налаштування не підтримуються';
            solution = 'Спробуйте перезавантажити сторінку';
            break;
        default:
            message += error.message || 'Невідома помилка';
            solution = 'Спробуйте:\n1. Перезавантажити сторінку\n2. Відкрити в Safari\n3. Перезавантажити телефон';
    }
    
    updateStatus(message, 'error');
    
    // Показуємо детальне повідомлення
    setTimeout(() => {
        alert(message + '\n\n' + solution);
    }, 1000);
}

// Захоплення фото
async function capturePhoto() {
    if (isProcessing) {
        updateStatus('Обробка вже відбувається...', 'warning');
        return;
    }
    
    if (!stream || video.videoWidth === 0) {
        updateStatus('Камера не готова', 'error');
        return;
    }
    
    try {
        isProcessing = true;
        captureBtn.disabled = true;
        updateStatus('Захоплення фото...', 'info');
        
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, width, height);
        
        // Покращення зображення для кращого OCR
        const iosInfo = getIOSInfo();
        if (iosInfo.isIOS) {
            enhanceImageForOCR(context, width, height);
        }
        
        updateStatus('Обробка зображення...', 'info');
        
        // Запуск OCR
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImage(canvas);
        } else {
            updateStatus('OCR недоступний', 'error');
        }
        
        // Копіювання в буфер (якщо підтримується)
        if (navigator.clipboard?.write) {
            copyToClipboard();
        }
        
    } catch (error) {
        console.error('Capture error:', error);
        updateStatus('Помилка обробки фото', 'error');
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
    }
}

// Покращення зображення для OCR
function enhanceImageForOCR(context, width, height) {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Конвертація в відтінки сірого з підвищенням контрасту
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const enhanced = gray > 128 ? Math.min(255, gray * 1.3) : Math.max(0, gray * 0.7);
        
        data[i] = enhanced;     // R
        data[i + 1] = enhanced; // G
        data[i + 2] = enhanced; // B
    }
    
    context.putImageData(imageData, 0, 0);
    console.log('Image enhanced for OCR');
}

// Копіювання в буфер
function copyToClipboard() {
    canvas.toBlob(async (blob) => {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            console.log('Image copied to clipboard');
        } catch (err) {
            console.log('Clipboard not available:', err);
        }
    });
}

// Зупинка камери
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
        video.srcObject = null;
        updateStatus('Камера зупинена', 'info');
    }
}

// Обробники подій
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - stopping camera');
        stopCamera();
    } else {
        console.log('Page visible - restarting camera');
        setTimeout(startCamera, 500);
    }
});

window.addEventListener('orientationchange', () => {
    console.log('Orientation changed');
    setTimeout(() => {
        if (stream) {
            stopCamera();
            setTimeout(startCamera, 1000);
        }
    }, 500);
});

// Ініціалізація
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== ІНІЦІАЛІЗАЦІЯ ДОДАТКУ ===');
    
    // Створюємо кнопку діагностики
    const diagButton = document.createElement('button');
    diagButton.textContent = 'Діагностика';
    diagButton.style.cssText = `
        position: fixed;
        top: 140px;
        right: 24px;
        background: rgba(255,255,255,0.9);
        border: none;
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 12px;
        z-index: 1000;
    `;
    diagButton.onclick = checkBrowserCapabilities;
    document.body.appendChild(diagButton);
    
    // Затримка для iPhone
    setTimeout(async () => {
        await startCamera();
    }, 1000);
    
    // Обробник кнопки фото
    if (captureBtn) {
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    // Клавіатурні скорочення
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
        if (e.key === ' ') {
            e.preventDefault();
            capturePhoto();
        }
    });
    
    console.log('App initialized');
});
