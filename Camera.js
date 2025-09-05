let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;

// Детекція iOS
function isiOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Запуск камери з адаптивними налаштуваннями для iOS
async function startCamera() {
    try {
        console.log('Запуск камери...');
        console.log('iOS device:', isiOS());
        
        // Спеціальні налаштування для iOS
        const isIOSDevice = isiOS();
        
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' }, // Задня камера для OCR
                width: isIOSDevice ? { ideal: 1280, max: 1920 } : { ideal: 1920, min: 640 },
                height: isIOSDevice ? { ideal: 720, max: 1080 } : { ideal: 1080, min: 480 },
                frameRate: isIOSDevice ? { ideal: 15, max: 30 } : { ideal: 30 }
            }
        };
        
        // Для iOS встановлюємо додаткові атрибути відео
        if (isIOSDevice) {
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            video.muted = true; // Важливо для iOS
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Чекаємо поки відео завантажиться
        return new Promise((resolve, reject) => {
            video.addEventListener('loadedmetadata', () => {
                console.log('Реальні розміри відео:', video.videoWidth, 'x', video.videoHeight);
                console.log('Показані розміри відео:', video.clientWidth, 'x', video.clientHeight);
                
                // Оновлюємо статус
                if (typeof ocrProcessor !== 'undefined') {
                    ocrProcessor.updateStatus('Готово до фото');
                }
                
                console.log('Камера запущена успішно');
                resolve();
            });
            
            video.addEventListener('error', (error) => {
                console.error('Помилка відео:', error);
                reject(error);
            });
            
            // Timeout для iOS
            setTimeout(() => {
                if (video.videoWidth === 0) {
                    console.log('Timeout - пробуємо fallback');
                    reject(new Error('Video timeout'));
                }
            }, 10000);
        });
        
    } catch (error) {
        console.error('Помилка камери:', error);
        
        // Fallback - спробуємо фронтальну камеру
        try {
            console.log('Пробуємо фронтальну камеру...');
            const fallbackConstraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280, min: 480 },
                    height: { ideal: 720, min: 360 }
                }
            };
            
            if (isiOS()) {
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.muted = true;
            }
            
            stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            video.srcObject = stream;
            console.log('Fallback камера запущена');
            
            return new Promise((resolve) => {
                video.addEventListener('loadedmetadata', () => {
                    if (typeof ocrProcessor !== 'undefined') {
                        ocrProcessor.updateStatus('Готово до фото (фронтальна камера)');
                    }
                    resolve();
                });
            });
            
        } catch (fallbackError) {
            console.error('Fallback помилка:', fallbackError);
            
            // Останній fallback - будь-яка доступна камера
            try {
                console.log('Пробуємо будь-яку доступну камеру...');
                const basicConstraints = {
                    video: true
                };
                
                stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
                video.srcObject = stream;
                
                if (typeof ocrProcessor !== 'undefined') {
                    ocrProcessor.updateStatus('Камера запущена (базові налаштування)');
                }
                
                console.log('Базова камера запущена');
            } catch (basicError) {
                console.error('Базова помилка камери:', basicError);
                if (typeof ocrProcessor !== 'undefined') {
                    ocrProcessor.updateStatus('Помилка доступу до камери', 'error');
                }
                
                // Показуємо детальну помилку для діагностики
                showCameraError(basicError);
            }
        }
    }
}

// Показати детальну інформацію про помилку камери
function showCameraError(error) {
    let errorMessage = 'Помилка камери: ';
    
    switch(error.name) {
        case 'NotAllowedError':
            errorMessage += 'Доступ до камери заборонено. Перевірте налаштування браузера.';
            break;
        case 'NotFoundError':
            errorMessage += 'Камера не знайдена на пристрої.';
            break;
        case 'NotSupportedError':
            errorMessage += 'Камера не підтримується цим браузером.';
            break;
        case 'NotReadableError':
            errorMessage += 'Камера зайнята іншим додатком.';
            break;
        case 'OverconstrainedError':
            errorMessage += 'Налаштування камери не підтримуються.';
            break;
        default:
            errorMessage += error.message || 'Невідома помилка';
    }
    
    console.error(errorMessage);
    alert(errorMessage + '\n\nСпробуйте:\n1. Оновити сторінку\n2. Дозволити доступ до камери\n3. Закрити інші додатки що використовують камеру');
}

// Захоплення фото та запуск OCR
async function capturePhoto() {
    if (isProcessing) {
        console.log('Обробка вже відбувається...');
        return;
    }

    console.log('=== ЗАХОПЛЕННЯ ФОТО ===');
    
    // Використовуємо реальні розміри відео для canvas
    const realWidth = video.videoWidth;
    const realHeight = video.videoHeight;
    
    if (realWidth === 0 || realHeight === 0) {
        console.error('Відео ще не завантажилось');
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.updateStatus('Відео ще не готове', 'error');
        }
        return;
    }
    
    try {
        isProcessing = true;
        captureBtn.disabled = true;
        
        // Встановлюємо розміри canvas відповідно до відео
        canvas.width = realWidth;
        canvas.height = realHeight;
        
        const context = canvas.getContext('2d');
        
        // Малюємо кадр з відео на canvas
        context.drawImage(video, 0, 0, realWidth, realHeight);
        
        console.log('=== ДЕТАЛЬНА ІНФОРМАЦІЯ ===');
        console.log('Відео розміри (реальні):', realWidth, 'x', realHeight);
        console.log('Canvas розміри:', canvas.width, 'x', canvas.height);
        console.log('Мегапікселі:', (realWidth * realHeight / 1000000).toFixed(2), 'MP');
        console.log('iOS device:', isiOS());
        
        // Покращення якості для iOS
        if (isiOS()) {
            // Додаткова обробка зображення для кращого OCR на iOS
            const imageData = context.getImageData(0, 0, realWidth, realHeight);
            const data = imageData.data;
            
            // Підвищуємо контрастність
            for (let i = 0; i < data.length; i += 4) {
                // Конвертуємо в градації сірого та підвищуємо контраст
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                const enhanced = gray > 128 ? Math.min(255, gray * 1.2) : Math.max(0, gray * 0.8);
                
                data[i] = enhanced;     // R
                data[i + 1] = enhanced; // G
                data[i + 2] = enhanced; // B
                // data[i + 3] залишаємо без змін (alpha)
            }
            
            context.putImageData(imageData, 0, 0);
            console.log('Застосовано покращення зображення для iOS');
        }
        
        // Запускаємо OCR обробку
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImage(canvas);
        } else {
            console.error('OCR процесор не доступний');
        }
        
        // Копіюємо в буфер для додаткового тестування (тільки якщо підтримується)
        if (navigator.clipboard && navigator.clipboard.write) {
            copyToClipboard();
        }
        
        console.log('=== ФОТО ОБРОБЛЕНО ===');
        
    } catch (error) {
        console.error('Помилка захоплення/обробки:', error);
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.updateStatus('Помилка обробки фото', 'error');
        }
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
    }
}

// Копіювання в буфер (додаткова функція)
function copyToClipboard() {
    if (navigator.clipboard && navigator.clipboard.write) {
        canvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ]);
                console.log('Зображення скопійовано в буфер! Розмір:', blob.size, 'байт');
            } catch (err) {
                console.log('Не вдалося скопіювати в буфер:', err);
            }
        });
    }
}

// Зупинка камери
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('Camera track stopped:', track.kind);
        });
        stream = null;
        video.srcObject = null;
        console.log('Камера зупинена');
    }
}

// Обробник видимості сторінки для економії батареї
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Сторінка прихована - зупиняємо камеру');
        stopCamera();
    } else {
        console.log('Сторінка відновлена - запускаємо камеру');
        setTimeout(() => {
            startCamera();
        }, 500);
    }
});

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ініціалізація додатку...');
    console.log('User Agent:', navigator.userAgent);
    console.log('iOS device:', isiOS());
    
    // Додаємо затримку для iOS
    const initDelay = isiOS() ? 1000 : 100;
    
    setTimeout(() => {
        startCamera();
    }, initDelay);
    
    // Додаємо обробник кнопки
    if (captureBtn) {
        captureBtn.addEventListener('click', capturePhoto);
    }
    
    // Додаємо можливість очищення результатів
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
    });
    
    // Додаємо обробник орієнтації для мобільних
    window.addEventListener('orientationchange', () => {
        console.log('Зміна орієнтації detected');
        setTimeout(() => {
            if (stream) {
                console.log('Перезапуск камери після зміни орієнтації');
                stopCamera();
                setTimeout(startCamera, 500);
            }
        }, 500);
    });
    
    console.log('Додаток готовий!');
});
