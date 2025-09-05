let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;

// Запуск камери з адаптивними налаштуваннями
async function startCamera() {
    try {
        console.log('Запуск камери...');
        
        // Пробуємо різні роздільності для кращої сумісності
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' }, // Задня камера для OCR
                width: { ideal: 1920, min: 640 },
                height: { ideal: 1080, min: 480 }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Чекаємо поки відео завантажиться
        video.addEventListener('loadedmetadata', () => {
            console.log('Реальні розміри відео:', video.videoWidth, 'x', video.videoHeight);
            console.log('Показані розміри відео:', video.clientWidth, 'x', video.clientHeight);
            
            // Оновлюємо статус
            if (typeof ocrProcessor !== 'undefined') {
                ocrProcessor.updateStatus('Готово до фото');
            }
        });
        
        console.log('Камера запущена успішно');
    } catch (error) {
        console.error('Помилка камери:', error);
        
        // Fallback - спробуємо фронтальну камеру
        try {
            const fallbackConstraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                }
            };
            stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            video.srcObject = stream;
            console.log('Fallback камера запущена');
        } catch (fallbackError) {
            console.error('Fallback помилка:', fallbackError);
            if (typeof ocrProcessor !== 'undefined') {
                ocrProcessor.updateStatus('Помилка доступу до камери', 'error');
            }
        }
    }
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
        
        // Запускаємо OCR обробку
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImage(canvas);
        } else {
            console.error('OCR процесор не доступний');
        }
        
        // Копіюємо в буфер для додаткового тестування
        copyToClipboard();
        
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

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ініціалізація додатку...');
    
    startCamera();
    
    // Додаємо обробник кнопки
    captureBtn.addEventListener('click', capturePhoto);
    
    // Додаємо можливість очищення результатів
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
    });
    
    console.log('Додаток готовий!');
});
