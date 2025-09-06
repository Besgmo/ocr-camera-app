console.log('=== camera.js ЗАВАНТАЖЕНО ===');

let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let cameraInput = document.getElementById('camera-input');
let imagePreview = document.getElementById('image-preview');
let isProcessing = false;

// Функція оновлення статусу
function updateStatus(message, type = 'default') {
    console.log(`🔄 Status (${type}): ${message}`);
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        
        // Використовуємо існуючі класи замість нових
        if (type === 'processing') {
            statusEl.className = 'word-item';
            statusEl.style.background = 'var(--dark)';
            statusEl.style.color = 'var(--white)';
            statusEl.style.animation = 'pulse 1.5s infinite';
        } else if (type === 'success') {
            statusEl.className = 'word-item';
            statusEl.style.background = 'var(--accent)';
            statusEl.style.color = 'var(--black)';
            statusEl.style.animation = 'none';
        } else if (type === 'error') {
            statusEl.className = 'word-item';
            statusEl.style.background = '#ff4444';
            statusEl.style.color = 'var(--white)';
            statusEl.style.animation = 'none';
        } else {
            statusEl.className = 'word-item';
            statusEl.style.background = '';
            statusEl.style.color = '';
            statusEl.style.animation = 'none';
        }
    }
}

// Перевірка підтримки камери
function checkCameraSupport() {
    console.log('🔍 Перевірка підтримки камери...');
    
    // Перевірка підтримки getUserMedia (не використовуємо, але корисно знати)
    const hasGetUserMedia = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    console.log('📹 getUserMedia підтримується:', hasGetUserMedia);
    
    // Перевірка підтримки File API
    const hasFileAPI = window.File && window.FileReader && window.FileList && window.Blob;
    console.log('📁 File API підтримується:', hasFileAPI);
    
    // Перевірка input[type="file"]
    const testInput = document.createElement('input');
    testInput.type = 'file';
    const hasFileInput = testInput.type === 'file';
    console.log('📤 File input підтримується:', hasFileInput);
    
    // Перевірка capture атрибуту
    const hasCapture = 'capture' in testInput;
    console.log('📸 Capture атрибут підтримується:', hasCapture);
    
    if (!hasFileAPI || !hasFileInput) {
        updateStatus('Ваш браузер не підтримує завантаження файлів', 'error');
        return false;
    }
    
    if (!hasCapture) {
        console.warn('⚠️ Capture атрибут не підтримується, але file input працюватиме');
    }
    
    return true;
}

// Відкриття вибору файлу/камери
function openCamera() {
    console.log('📸 Натиснуто кнопку камери');
    
    if (!cameraInput) {
        console.error('❌ Camera input не знайдено!');
        updateStatus('Помилка: елемент камери не знайдено', 'error');
        return;
    }
    
    console.log('🎯 Відкриваємо вибір файлу/камери...');
    updateStatus('Відкриваємо камеру...', 'processing');
    
    try {
        // Програмне натискання на input
        cameraInput.click();
        console.log('✅ click() викликано успішно');
    } catch (error) {
        console.error('❌ Помилка при виклику click():', error);
        updateStatus('Помилка відкриття камери', 'error');
    }
}

// Обробка вибору файлу
function handleFileSelect(event) {
    console.log('📁 handleFileSelect викликано');
    console.log('📁 Event:', event);
    console.log('📁 Files:', event.target.files);
    
    const file = event.target.files[0];
    
    if (!file) {
        console.log('❌ Файл не обрано або скасовано');
        updateStatus('Файл не обрано', 'error');
        return;
    }

    console.log('✅ Файл обрано:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toLocaleString()
    });
    
    // Перевірка типу файлу
    if (!file.type.startsWith('image/')) {
        console.error('❌ Обраний файл не є зображенням:', file.type);
        updateStatus('Будь ласка, оберіть зображення', 'error');
        return;
    }
    
    updateStatus('Файл обрано, обробляємо...', 'processing');
    
    // Показуємо прев'ю
    showImagePreview(file);
    
    // Обробляємо зображення
    processImageFile(file);
}

// Показ прев'ю зображення
function showImagePreview(file) {
    console.log('🖼️ Показуємо прев\'ю зображення');
    
    if (!imagePreview) {
        console.error('❌ Image preview елемент не знайдено');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        console.log('✅ Прев\'ю показано успішно');
    };
    
    reader.onerror = function(error) {
        console.error('❌ Помилка читання файлу для прев\'ю:', error);
        updateStatus('Помилка показу прев\'ю', 'error');
    };
    
    reader.readAsDataURL(file);
}

// Обробка зображення
async function processImageFile(file) {
    if (isProcessing) {
        console.log('⏳ Обробка вже відбувається...');
        return;
    }

    console.log('🔄 Початок обробки зображення');

    try {
        isProcessing = true;
        if (captureBtn) captureBtn.disabled = true;
        
        updateStatus('Підготовка зображення...', 'processing');

        // Створюємо canvas з зображення
        const imageCanvas = await createCanvasFromFile(file);
        
        const megapixels = (imageCanvas.width * imageCanvas.height / 1000000).toFixed(2);
        console.log('✅ Canvas створено успішно:', {
            width: imageCanvas.width,
            height: imageCanvas.height,
            megapixels: megapixels + 'MP'
        });

        updateStatus('Запускаємо розпізнавання тексту...', 'processing');

        // Запускаємо OCR
        if (typeof ocrProcessor !== 'undefined') {
            console.log('🤖 Запускаємо OCR процесор');
            await ocrProcessor.processImage(imageCanvas);
        } else {
            console.error('❌ OCR процесор не доступний');
            updateStatus('OCR процесор не завантажено', 'error');
        }

        console.log('✅ Обробка зображення завершена');

    } catch (error) {
        console.error('❌ Помилка обробки зображення:', error);
        updateStatus('Помилка обробки: ' + error.message, 'error');
    } finally {
        isProcessing = false;
        if (captureBtn) captureBtn.disabled = false;
    }
}

// Створення canvas з файлу
function createCanvasFromFile(file) {
    console.log('🎨 Створюємо canvas з файлу');
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = function() {
            try {
                console.log('🖼️ Зображення завантажено:', {
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight
                });
                
                // Встановлюємо розміри canvas
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                const context = canvas.getContext('2d');
                
                // Очищуємо canvas
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Малюємо зображення на canvas
                context.drawImage(img, 0, 0);
                
                console.log('✅ Зображення успішно намальовано на canvas');
                resolve(canvas);
            } catch (error) {
                console.error('❌ Помилка малювання на canvas:', error);
                reject(new Error('Помилка малювання на canvas: ' + error.message));
            }
        };
        
        img.onerror = function(error) {
            console.error('❌ Помилка завантаження зображення:', error);
            reject(new Error('Не вдалося завантажити зображення'));
        };
        
        // Створюємо URL для зображення
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log('📖 FileReader завантажив файл');
            img.src = e.target.result;
        };
        reader.onerror = function(error) {
            console.error('❌ FileReader помилка:', error);
            reject(new Error('Помилка читання файлу'));
        };
        
        console.log('📖 Читаємо файл через FileReader');
        reader.readAsDataURL(file);
    });
}

// Скидання стану
function reset() {
    console.log('🔄 Скидання стану камери');
    
    // Приховуємо прев'ю
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }
    
    // Очищуємо input
    if (cameraInput) {
        cameraInput.value = '';
    }
    
    // Скидаємо статус
    updateStatus('Готово до фото');
    
    // Включаємо кнопку
    if (captureBtn) {
        captureBtn.disabled = false;
    }
    
    console.log('✅ Стан камери скинуто');
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Ініціалізація camera.js');
    
    // Перевіряємо підтримку
    if (!checkCameraSupport()) {
        return;
    }
    
    // Перевіряємо наявність елементів
    console.log('🔍 Перевірка елементів DOM:');
    console.log('- canvas:', !!canvas);
    console.log('- captureBtn:', !!captureBtn);
    console.log('- cameraInput:', !!cameraInput);
    console.log('- imagePreview:', !!imagePreview);
    
    if (!captureBtn) {
        console.error('❌ Кнопка capture не знайдена!');
        updateStatus('Помилка: кнопка не знайдена', 'error');
        return;
    }
    
    if (!cameraInput) {
        console.error('❌ Input camera-input не знайдений!');
        updateStatus('Помилка: input не знайдений', 'error');
        return;
    }
    
    // Налаштовуємо обробники подій
    console.log('🔗 Налаштовуємо обробники подій');
    
    captureBtn.addEventListener('click', function() {
        console.log('🖱️ Кнопка натиснута');
        openCamera();
    });
    
    cameraInput.addEventListener('change', function(event) {
        console.log('📁 Input change event');
        handleFileSelect(event);
    });
    
    // Додаємо обробник для debugging
    cameraInput.addEventListener('click', function() {
        console.log('🖱️ Camera input натиснутий');
    });
    
    updateStatus('Готово до фото');
    
    // Додаємо можливість очищення результатів
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof ocrProcessor !== 'undefined') {
            console.log('⌨️ Escape натиснуто - скидаємо');
            ocrProcessor.reset();
        }
    });
    
    console.log('✅ Camera.js готовий до роботи!');
});

// Експорт для сумісності з іншими модулями
window.cameraModule = {
    reset: reset,
    updateStatus: updateStatus,
    openCamera: openCamera
};

console.log('✅ camera.js модуль завантажено');
