console.log('=== Camera.js ЗАВАНТАЖЕНО ===');

// Глобальні змінні
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let stream = null;
let isProcessing = false;

// Функція ініціалізації камери
async function initCamera() {
    console.log('=== ІНІЦІАЛІЗАЦІЯ КАМЕРИ ===');
    
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    captureBtn = document.getElementById('capture');
    
    console.log('Елементи знайдено:', {
        video: !!video,
        canvas: !!canvas,
        captureBtn: !!captureBtn
    });
    
    if (!video || !canvas || !captureBtn) {
        console.error('Критичні елементи не знайдено');
        return;
    }
    
    try {
        // Запитуємо доступ до камери
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Задня камера
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        video.srcObject = stream;
        console.log('Камера ініціалізована успішно');
        
        // Додаємо обробник для кнопки фото
        captureBtn.addEventListener('click', capturePhoto);
        
    } catch (err) {
        console.error('Помилка доступу до камери:', err);
        alert('Помилка доступу до камери: ' + err.message);
    }
}

// Функція зупинки камери
function stopCamera() {
    console.log('=== ЗУПИНКА КАМЕРИ ===');
    
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('Track зупинено:', track.kind);
        });
        stream = null;
    }
    
    if (video) {
        video.srcObject = null;
    }
}

// Функція створення фото
function capturePhoto() {
    console.log('=== СТВОРЕННЯ ФОТО ===');
    
    if (!video || !canvas) {
        console.error('Video або canvas не знайдено');
        return;
    }
    
    if (isProcessing) {
        console.log('Фото вже обробляється');
        return;
    }
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('Відео ще не готове');
        alert('Зачекайте, камера ще завантажується...');
        return;
    }
    
    try {
        // Встановлюємо розмір canvas під відео
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Малюємо кадр з відео на canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        console.log('Фото створено:', canvas.width, 'x', canvas.height);
        
        // Конвертуємо в blob та передаємо в OCR
        canvas.toBlob(function(blob) {
            if (blob) {
                console.log('Blob створено, розмір:', blob.size);
                processImageBlob(blob);
            } else {
                console.error('Не вдалося створити blob');
                alert('Помилка створення фото');
            }
        }, 'image/jpeg', 0.8);
        
    } catch (error) {
        console.error('Помилка створення фото:', error);
        alert('Помилка створення фото: ' + error.message);
    }
}

// Функція обробки blob зображення
async function processImageBlob(blob) {
    console.log('=== ОБРОБКА ЗОБРАЖЕННЯ ===');
    
    if (isProcessing) {
        console.log('Вже обробляється');
        return;
    }
    
    try {
        isProcessing = true;
        captureBtn.disabled = true;
        captureBtn.textContent = 'Обробляємо...';
        
        // Передаємо в OCR процесор
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImageBlob(blob);
        } else {
            console.error('OCR процесор не знайдено');
            alert('OCR процесор не завантажений');
        }
        
    } catch (error) {
        console.error('Помилка обробки:', error);
        alert('Помилка обробки зображення: ' + error.message);
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
        captureBtn.textContent = 'Зробити фото';
    }
}

// Функція скидання
function reset() {
    console.log('=== СКИДАННЯ КАМЕРИ ===');
    
    isProcessing = false;
    
    if (captureBtn) {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Зробити фото';
    }
    
    // Очищаємо canvas
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Функція оновлення статусу (для сумісності)
function updateStatus(message, type = 'default') {
    console.log(`Camera Status: ${message}`);
    // Можна додати візуальний індикатор статусу якщо потрібно
}

// Обробники подій
window.addEventListener('load', initCamera);
window.addEventListener('beforeunload', stopCamera);

// Обробник Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        reset();
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
    }
});

// Експорт для сумісності
window.cameraModule = {
    reset: reset,
    updateStatus: updateStatus,
    stopCamera: stopCamera,
    initCamera: initCamera
};

console.log('Camera.js завантажено та готовий до роботи');
