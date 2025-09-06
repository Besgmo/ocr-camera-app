console.log('=== НОВИЙ camera.js ЗАВАНТАЖЕНО ===');

// Глобальні змінні
let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let cameraInput = document.getElementById('camera-input');
let imagePreview = document.getElementById('image-preview');
let statusEl = document.getElementById('status');
let isProcessing = false;

// Функція оновлення статусу
function updateStatus(message, type = 'default') {
    console.log(`Status: ${message}`);
    if (statusEl) {
        statusEl.textContent = message;
        if (type === 'error') {
            statusEl.style.color = '#ff4444';
        } else if (type === 'success') {
            statusEl.style.color = '#01F55F';
        } else if (type === 'processing') {
            statusEl.style.color = '#545454';
        } else {
            statusEl.style.color = '#545454';
        }
    }
}

// Функція відкриття камери
function capturePhoto() {
    console.log('=== НАТИСНУТО КНОПКУ КАМЕРИ ===');
    
    if (!cameraInput) {
        console.error('Camera input не знайдено');
        updateStatus('Помилка: camera input не знайдено', 'error');
        return;
    }
    
    updateStatus('Відкриваємо камеру...', 'processing');
    
    // Програмно натискаємо на input
    try {
        cameraInput.click();
        console.log('Camera input click викликано');
    } catch (error) {
        console.error('Помилка при виклику click:', error);
        updateStatus('Помилка відкриття камери', 'error');
    }
}

// Обробка вибору файлу
function handleFileChange(event) {
    console.log('=== ФАЙЛ ОБРАНО ===');
    
    const file = event.target.files[0];
    
    if (!file) {
        console.log('Файл не обрано');
        updateStatus('Файл не обрано', 'error');
        return;
    }
    
    console.log('Файл:', {
        name: file.name,
        size: file.size,
        type: file.type
    });
    
    if (!file.type.startsWith('image/')) {
        console.error('Файл не є зображенням');
        updateStatus('Оберіть зображення', 'error');
        return;
    }
    
    updateStatus('Обробляємо фото...', 'processing');
    
    // Показуємо прев'ю
    showPreview(file);
    
    // Обробляємо файл
    processFile(file);
}

// Показ прев'ю
function showPreview(file) {
    if (!imagePreview) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        console.log('Прев\'ю показано');
    };
    reader.readAsDataURL(file);
}

// Обробка файлу
async function processFile(file) {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        captureBtn.disabled = true;
        
        updateStatus('Створюємо canvas...', 'processing');
        
        // Створюємо canvas з файлу
        const processedCanvas = await createCanvasFromFile(file);
        
        console.log('Canvas створено:', processedCanvas.width, 'x', processedCanvas.height);
        
        updateStatus('Запускаємо OCR...', 'processing');
        
        // Передаємо в OCR
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImage(processedCanvas);
        } else {
            throw new Error('OCR процесор не знайдено');
        }
        
    } catch (error) {
        console.error('Помилка обробки:', error);
        updateStatus('Помилка обробки: ' + error.message, 'error');
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
    }
}

// Створення canvas з файлу
function createCanvasFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = function() {
            try {
                // Оновлюємо canvas
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                console.log('Canvas оновлено');
                resolve(canvas);
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Не вдалося завантажити зображення'));
        
        // Читаємо файл
        const reader = new FileReader();
        reader.onload = (e) => img.src = e.target.result;
        reader.onerror = () => reject(new Error('Помилка читання файлу'));
        reader.readAsDataURL(file);
    });
}

// Скидання
function reset() {
    console.log('Скидання камери');
    
    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }
    
    if (cameraInput) {
        cameraInput.value = '';
    }
    
    updateStatus('Готово до фото');
    
    if (captureBtn) {
        captureBtn.disabled = false;
    }
}

// Ініціалізація
function initCamera() {
    console.log('=== ІНІЦІАЛІЗАЦІЯ КАМЕРИ ===');
    
    // Перевіряємо елементи
    canvas = document.getElementById('canvas');
    captureBtn = document.getElementById('capture');
    cameraInput = document.getElementById('camera-input');
    imagePreview = document.getElementById('image-preview');
    statusEl = document.getElementById('status');
    
    console.log('Елементи знайдено:', {
        canvas: !!canvas,
        captureBtn: !!captureBtn,
        cameraInput: !!cameraInput,
        imagePreview: !!imagePreview,
        statusEl: !!statusEl
    });
    
    if (!captureBtn || !cameraInput) {
        console.error('Критичні елементи не знайдено');
        return;
    }
    
    // Додаємо обробники
    captureBtn.addEventListener('click', capturePhoto);
    cameraInput.addEventListener('change', handleFileChange);
    
    // Обробник Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            reset();
            if (typeof ocrProcessor !== 'undefined') {
                ocrProcessor.reset();
            }
        }
    });
    
    updateStatus('Готово до фото');
    console.log('Камера ініціалізована');
}

// Експорт для сумісності
window.cameraModule = {
    reset: reset,
    updateStatus: updateStatus
};

// Запуск при завантаженні DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCamera);
} else {
    initCamera();
}
