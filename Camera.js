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

// Показ статусу з детальними логами
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

// Перевірка що блокує доступ до камери
async function checkCameraBlocking() {
    debugLog('=== ПЕРЕВІРКА БЛОКУВАННЯ КАМЕРИ ===');
    
    const issues = [];
    
    // 1. Перевірка основних API
    if (!navigator.mediaDevices) {
        issues.push('navigator.mediaDevices недоступний');
    }
    
    if (!navigator.mediaDevices?.getUserMedia) {
        issues.push('getUserMedia недоступний');
    }
    
    // 2. Перевірка протоколу
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        issues.push(`Небезпечний протокол: ${location.protocol}. Потрібен HTTPS`);
    }
    
    // 3. Перевірка поточного стану дозволу
    if (navigator.permissions) {
        try {
            const permission = await navigator.permissions.query({ name: 'camera' });
            debugLog('Поточний дозвіл камери:', permission.state);
            
            if (permission.state === 'denied') {
                issues.push('Дозвіл до камери ЗАБОРОНЕНО в налаштуваннях браузера');
            }
        } catch (error) {
            debugLog('Помилка перевірки дозволу:', error);
        }
    }
    
    // 4. Перевірка доступних пристроїв
    if (navigator.mediaDevices?.enumerateDevices) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(d => d.kind === 'videoinput');
            debugLog('Знайдено камер:', cameras.length);
            
            if (cameras.length === 0) {
                issues.push('Камери не знайдені в системі');
            } else {
                cameras.forEach((cam, i) => {
                    debugLog(`Камера ${i + 1}:`, cam.label || 'Без назви');
                });
            }
        } catch (error) {
            issues.push('Помилка перевірки пристроїв: ' + error.message);
        }
    }
    
    debugLog('Знайдені проблеми:', issues);
    return issues;
}

// Примусовий запит дозволу з детальним логуванням
async function forcePermissionRequest() {
    debugLog('=== ПРИМУСОВИЙ ЗАПИТ ДОЗВОЛУ ===');
    showStatus('Запитуємо дозвіл до камери...', 'info');
    
    try {
        debugLog('Перед getUserMedia...');
        
        // Найпростіший можливий запит
        const constraints = { 
            video: true,
            audio: false 
        };
        
        debugLog('Constraints:', constraints);
        
        // Встановлюємо таймаут для виявлення зависання
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('TIMEOUT: Chrome не показав діалог дозволу через 10 секунд'));
            }, 10000);
        });
        
        const permissionPromise = navigator.mediaDevices.getUserMedia(constraints);
        
        // Гонка між запитом та таймаутом
        const result = await Promise.race([permissionPromise, timeoutPromise]);
        
        debugLog('getUserMedia успішний!');
        debugLog('Stream отримано:', result);
        
        // Одразу зупиняємо тестовий потік
        result.getTracks().forEach(track => {
            debugLog('Зупиняємо track:', track.kind);
            track.stop();
        });
        
        showStatus('Дозвіл отримано! Запускаємо камеру...', 'success');
        
        // Запускаємо реальну камеру
        setTimeout(() => {
            startRealCamera();
        }, 1000);
        
        return true;
        
    } catch (error) {
        debugLog('getUserMedia помилка:', error);
        
        // Детальний аналіз помилки
        let explanation = '';
        let solution = '';
        
        switch (error.name) {
            case 'NotAllowedError':
                explanation = 'Користувач заборонив доступ або браузер заблокував запит';
                solution = 'Клікніть на іконку камери/замка в адресному рядку Chrome та дозвольте доступ';
                break;
                
            case 'NotFoundError':
                explanation = 'Камера не знайдена в системі';
                solution = 'Перевірте підключення камери та закрийте інші програми що її використовують';
                break;
                
            case 'NotSupportedError':
                explanation = 'Браузер не підтримує доступ до камери';
                solution = 'Оновіть Chrome або спробуйте інший браузер';
                break;
                
            case 'NotReadableError':
                explanation = 'Камера недоступна (можливо використовується іншою програмою)';
                solution = 'Закрийте Zoom, Skype, OBS та інші програми що використовують камеру';
                break;
                
            case 'OverconstrainedError':
                explanation = 'Налаштування камери не підтримуються';
                solution = 'Спробуйте перезавантажити сторінку';
                break;
                
            default:
                if (error.message.includes('TIMEOUT')) {
                    explanation = 'Chrome не показав діалог дозволу - це означає що щось блокує запит';
                    solution = 'Перевірте: 1) Адблокери 2) Налаштування приватності 3) Корпоративні політики 4) Антивірус';
                } else {
                    explanation = error.message || 'Невідома помилка';
                    solution = 'Спробуйте перезавантажити браузер';
                }
        }
        
        showStatus(`ПОМИЛКА: ${explanation}`, 'error');
        
        // Показуємо детальну допомогу
        setTimeout(() => {
            alert(`Помилка доступу до камери\n\nПроблема: ${explanation}\n\nРішення: ${solution}\n\nДетальна помилка: ${error.name} - ${error.message}`);
        }, 1000);
        
        return false;
    }
}

// Запуск реальної камери після отримання дозволу
async function startRealCamera() {
    debugLog('=== ЗАПУСК РЕАЛЬНОЇ КАМЕРИ ===');
    showStatus('Налаштовуємо камеру...', 'info');
    
    // Налаштування відео елемента
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    const configs = [
        {
            name: 'Висока якість (задня камера)',
            constraints: {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30 }
                }
            }
        },
        {
            name: 'Середня якість',
            constraints: {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            }
        },
        {
            name: 'Фронтальна камера',
            constraints: {
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            }
        },
        {
            name: 'Базові налаштування',
            constraints: {
                video: true
            }
        }
    ];
    
    for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        
        try {
            showStatus(`Спроба ${i + 1}: ${config.name}`, 'info');
            debugLog(`Спроба ${i + 1}:`, config.constraints);
            
            stream = await navigator.mediaDevices.getUserMedia(config.constraints);
            video.srcObject = stream;
            
            // Чекаємо готовність відео
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video loading timeout'));
                }, 8000);
                
                const checkReady = () => {
                    debugLog('Video state:', {
                        readyState: video.readyState,
                        videoWidth: video.videoWidth,
                        videoHeight: video.videoHeight
                    });
                    
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                
                video.addEventListener('loadedmetadata', checkReady);
                video.addEventListener('loadeddata', checkReady);
                video.addEventListener('canplay', checkReady);
                
                video.play().catch(e => debugLog('Play error:', e));
                
                // Перевіряємо відразу
                checkReady();
            });
            
            // Успіх!
            const width = video.videoWidth;
            const height = video.videoHeight;
            
            debugLog('Камера запущена успішно:', { width, height, config: config.name });
            showStatus(`Камера працює! ${width}x${height} (${config.name})`, 'success');
            
            // Активуємо кнопку
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
    
    showStatus('Не вдалося запустити камеру з жодними налаштуваннями', 'error');
    return false;
}

// Захоплення фото
async function capturePhoto() {
    if (isProcessing) return;
    
    if (!stream || !video.videoWidth) {
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
        
        debugLog('Photo captured:', { width, height });
        
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

// Ініціалізація з автоматичною діагностикою
document.addEventListener('DOMContentLoaded', async function() {
    debugLog('=== ІНІЦІАЛІЗАЦІЯ ДОДАТКУ ===');
    debugLog('User Agent:', navigator.userAgent);
    debugLog('Location:', location.href);
    
    // Блокуємо кнопку
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.textContent = 'Перевірка камери...';
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    // Показуємо інтерфейс діагностики
    showStatus('Перевіряємо доступ до камери...', 'info');
    
    // Виконуємо перевірку
    const issues = await checkCameraBlocking();
    
    if (issues.length > 0) {
        debugLog('Знайдені проблеми:', issues);
        showStatus(`Проблеми: ${issues.join('; ')}`, 'error');
        
        // Створюємо кнопку ручного запуску
        const manualBtn = document.createElement('button');
        manualBtn.textContent = 'Спробувати все одно';
        manualBtn.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff6600;
            color: white;
            border: none;
            border-radius: 25px;
            padding: 12px 24px;
            font-size: 16px;
            cursor: pointer;
            z-index: 1001;
        `;
        manualBtn.onclick = forcePermissionRequest;
        document.body.appendChild(manualBtn);
        
    } else {
        debugLog('Проблем не знайдено, запускаємо запит дозволу');
        // Автоматично запускаємо запит дозволу
        setTimeout(forcePermissionRequest, 1000);
    }
    
    // Клавіатурні скорочення
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && !captureBtn?.disabled) {
            e.preventDefault();
            capturePhoto();
        }
    });
    
    debugLog('Ініціалізація завершена');
});
