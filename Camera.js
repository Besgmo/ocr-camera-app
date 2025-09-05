let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;

// Детальна діагностика системи
async function runDiagnostics() {
    const results = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        protocol: location.protocol,
        hostname: location.hostname,
        mediaDevicesSupport: !!navigator.mediaDevices,
        getUserMediaSupport: !!navigator.mediaDevices?.getUserMedia,
        permissions: null,
        devices: [],
        errors: []
    };
    
    console.log('=== ПОВНА ДІАГНОСТИКА ===');
    
    // Перевірка дозволів
    if (navigator.permissions) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });
            results.permissions = permissionStatus.state;
            console.log('Camera permission:', permissionStatus.state);
        } catch (error) {
            results.errors.push('Permission API error: ' + error.message);
        }
    }
    
    // Перевірка доступних пристроїв
    if (navigator.mediaDevices?.enumerateDevices) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            results.devices = devices.filter(d => d.kind === 'videoinput').map(d => ({
                deviceId: d.deviceId,
                label: d.label || 'Camera',
                groupId: d.groupId
            }));
            console.log('Available cameras:', results.devices);
        } catch (error) {
            results.errors.push('Enumerate devices error: ' + error.message);
        }
    }
    
    console.log('Diagnostic results:', results);
    return results;
}

// Показ статусу
function showStatus(message, type = 'info', persistent = false) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    let statusEl = document.getElementById('status-display');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'status-display';
        statusEl.style.cssText = `
            position: fixed;
            top: 80px;
            left: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            text-align: center;
            word-break: break-word;
        `;
        document.body.appendChild(statusEl);
    }
    
    statusEl.textContent = message;
    statusEl.style.background = type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff';
    
    if (!persistent && type !== 'error') {
        setTimeout(() => {
            if (statusEl.parentNode) {
                statusEl.style.opacity = '0';
                setTimeout(() => statusEl.remove(), 300);
            }
        }, 4000);
    }
}

// Створення інтерфейсу діагностики
function createDiagnosticInterface() {
    const container = document.createElement('div');
    container.id = 'diagnostic-panel';
    container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 1001;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    container.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: #333;">Камера не працює</h3>
        <div id="diagnostic-info" style="font-size: 14px; color: #666; margin-bottom: 20px;">
            Виконується діагностика...
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button id="try-permission" class="btn-diag btn-primary">Запросити дозвіл</button>
            <button id="try-basic" class="btn-diag btn-secondary">Базова камера</button>
            <button id="show-help" class="btn-diag btn-secondary">Допомога</button>
            <button id="close-diag" class="btn-diag btn-secondary">Закрити</button>
        </div>
    `;
    
    // Стилі для кнопок
    const style = document.createElement('style');
    style.textContent = `
        .btn-diag {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .btn-primary { background: #01F55F; color: black; }
        .btn-secondary { background: #ddd; color: #333; }
        .btn-diag:hover { opacity: 0.8; }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(container);
    return container;
}

// Спроба отримання дозволу
async function requestBasicPermission() {
    showStatus('Запитуємо базовий дозвіл до камери...', 'info');
    
    try {
        // Найпростіший запит
        const testStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false 
        });
        
        console.log('Permission granted, test stream:', testStream);
        
        // Зупиняємо тестовий потік
        testStream.getTracks().forEach(track => track.stop());
        
        showStatus('Дозвіл отримано! Запускаємо камеру...', 'success');
        
        // Запускаємо камеру
        setTimeout(() => startActualCamera(), 1000);
        
        return true;
        
    } catch (error) {
        console.error('Permission request failed:', error);
        showStatus(`Дозвіл відхилено: ${error.name}`, 'error', true);
        
        showPermissionHelp(error);
        return false;
    }
}

// Запуск реальної камери
async function startActualCamera() {
    showStatus('Запускаємо камеру...', 'info');
    
    // Базові налаштування відео
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    // iOS специфічні атрибути
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    // Різні варіанти налаштувань
    const configurations = [
        // Висока якість
        {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
            }
        },
        // Середня якість
        {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        // Фронтальна камера
        {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        },
        // Мінімальні налаштування
        {
            video: true
        }
    ];
    
    for (let i = 0; i < configurations.length; i++) {
        try {
            showStatus(`Спроба ${i + 1}/${configurations.length}...`, 'info');
            
            stream = await navigator.mediaDevices.getUserMedia(configurations[i]);
            video.srcObject = stream;
            
            // Чекаємо готовність відео
            await waitForVideo();
            
            const width = video.videoWidth;
            const height = video.videoHeight;
            
            if (width > 0 && height > 0) {
                showStatus(`Камера працює! ${width}x${height}`, 'success');
                
                // Активуємо кнопку
                if (captureBtn) {
                    captureBtn.disabled = false;
                    captureBtn.textContent = 'Зробити фото';
                }
                
                // Прибираємо діагностичну панель
                const diagPanel = document.getElementById('diagnostic-panel');
                if (diagPanel) {
                    diagPanel.remove();
                }
                
                return true;
            }
            
        } catch (error) {
            console.error(`Configuration ${i + 1} failed:`, error);
            
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
        }
    }
    
    showStatus('Всі спроби запуску камери невдалі', 'error', true);
    return false;
}

// Очікування готовності відео
function waitForVideo() {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Video loading timeout'));
        }, 10000);
        
        const checkReady = () => {
            if (video.readyState >= 2 && video.videoWidth > 0) {
                clearTimeout(timeout);
                resolve();
            }
        };
        
        video.addEventListener('loadedmetadata', checkReady);
        video.addEventListener('loadeddata', checkReady);
        video.addEventListener('canplay', checkReady);
        
        // Запускаємо відтворення
        video.play().catch(console.warn);
        
        // Перевіряємо стан відразу
        checkReady();
    });
}

// Показ допомоги при помилках дозволу
function showPermissionHelp(error) {
    let help = 'Інструкції для вирішення проблеми:\n\n';
    
    switch (error.name) {
        case 'NotAllowedError':
            help += `CHROME:
1. Клікніть на іконку замка/камери в адресному рядку
2. Встановіть "Камера" в "Дозволити"
3. Оновіть сторінку

SAFARI (iPhone):
1. Налаштування → Safari → Камера → Дозволити для всіх сайтів
2. Або натисніть "Настройки для цього веб-сайта" → Камера → Дозволити

ІНШІ БРАУЗЕРИ:
1. Перевірте налаштування приватності
2. Спробуйте відкрити в іншому браузері`;
            break;
            
        case 'NotFoundError':
            help += `Камера не знайдена:
1. Перевірте підключення камери (для ПК)
2. Закрийте інші додатки що можуть використовувати камеру
3. Перезавантажте браузер/пристрій`;
            break;
            
        case 'NotSupportedError':
            help += `Не підтримується:
1. Оновіть браузер до останньої версії
2. Спробуйте інший браузер (Chrome, Safari, Firefox)
3. Перевірте що сайт відкритий через HTTPS`;
            break;
            
        default:
            help += `Загальні рішення:
1. Оновіть браузер
2. Перевірте що сайт відкритий через HTTPS
3. Спробуйте інший браузер
4. Перезавантажте пристрій`;
    }
    
    setTimeout(() => alert(help), 1000);
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
        
        const width = video.videoWidth;
        const height = video.videoHeight;
        
        canvas.width = width;
        canvas.height = height;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, width, height);
        
        showStatus('Фото захоплено! Запускаємо OCR...', 'info');
        
        // OCR обробка
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImage(canvas);
        } else {
            showStatus('OCR модуль недоступний', 'error');
        }
        
    } catch (error) {
        console.error('Capture error:', error);
        showStatus('Помилка захоплення фото', 'error');
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
        captureBtn.textContent = 'Зробити фото';
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== УНІВЕРСАЛЬНА ІНІЦІАЛІЗАЦІЯ ===');
    
    // Блокуємо кнопку фото
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.textContent = 'Камера не готова';
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    // Запускаємо діагностику
    const diagnostics = await runDiagnostics();
    
    // Перевіряємо базову підтримку
    if (!diagnostics.mediaDevicesSupport || !diagnostics.getUserMediaSupport) {
        showStatus('Браузер не підтримує доступ до камери', 'error', true);
        return;
    }
    
    if (diagnostics.protocol !== 'https:' && diagnostics.hostname !== 'localhost') {
        showStatus('Потрібен HTTPS для роботи камери', 'error', true);
        return;
    }
    
    // Показуємо діагностичну панель
    const diagPanel = createDiagnosticInterface();
    
    // Заповнюємо інформацію
    const infoEl = document.getElementById('diagnostic-info');
    infoEl.innerHTML = `
        <strong>Браузер:</strong> ${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Інший'}<br>
        <strong>Протокол:</strong> ${diagnostics.protocol}<br>
        <strong>Дозвіл камери:</strong> ${diagnostics.permissions || 'Невідомо'}<br>
        <strong>Знайдено камер:</strong> ${diagnostics.devices.length}
    `;
    
    // Обробники кнопок
    document.getElementById('try-permission').onclick = requestBasicPermission;
    document.getElementById('try-basic').onclick = () => startActualCamera();
    document.getElementById('show-help').onclick = () => showPermissionHelp({ name: 'NotAllowedError' });
    document.getElementById('close-diag').onclick = () => diagPanel.remove();
    
    // Клавіатурні скорочення
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ' && !captureBtn?.disabled) {
            e.preventDefault();
            capturePhoto();
        }
    });
    
    console.log('Initialization complete - diagnostic panel shown');
});
