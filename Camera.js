let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let cameraInput = document.getElementById('camera-input');
let imagePreview = document.getElementById('image-preview');
let isProcessing = false;

// Функція оновлення статусу - використовуємо існуючі класи
function updateStatus(message, type = 'default') {
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
    console.log(`Status (${type}):`, message);
}

// Відкриття нативної камери телефону
async function openCamera() {
    console.log('Відкриваємо камеру телефону...');
    if (cameraInput) {
        cameraInput.click();
    }
}

// Обробка вибору файлу з камери
async function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        console.log('Файл не обрано');
        return;
    }

    console.log('Файл обрано:', file.name, file.size, 'bytes');
    
    // Показуємо прев'ю
    showImagePreview(file);
    
    // Обробляємо зображення
    processImageFile(file);
}

// Показ прев'ю зображення
function showImagePreview(file) {
    if (!imagePreview) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
        console.log('Прев\'ю показано');
    };
    
    reader.onerror = function() {
        console.error('Помилка читання файлу для прев\'ю');
    };
    
    reader.readAsDataURL(file);
}

// Обробка зображення
async function processImageFile(file) {
    if (isProcessing) {
        console.log('Обробка вже відбувається...');
        return;
    }

    try {
        isProcessing = true;
        captureBtn.disabled = true;
        updateStatus('Підготовка зображення...', 'processing');

        // Створюємо canvas з зображення
        const imageCanvas = await createCanvasFromFile(file);
        
        console.log('Canvas створено, розміри:', imageCanvas.width, 'x', imageCanvas.height);
        console.log('Мегапікселі:', (imageCanvas.width * imageCanvas.height / 1000000).toFixed(2), 'MP');

        // Запускаємо OCR
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImage(imageCanvas);
        } else {
            console.error('OCR процесор не доступний');
            updateStatus('OCR не доступний', 'error');
        }

        console.log('Обробка завершена');

    } catch (error) {
        console.error('Помилка обробки зображення:', error);
        updateStatus('Помилка обробки зображення', 'error');
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
    }
}

// Створення canvas з файлу
function createCanvasFromFile(file) {
    return new Promise((resolve, reject) => {
        // Перевіряємо тип файлу
        if (!file.type.startsWith('image/')) {
            reject(new Error('Обраний файл не є зображенням'));
            return;
        }

        const img = new Image();
        
        img.onload = function() {
            try {
                // Встановлюємо розміри canvas
                canvas.width = img.width;
                canvas.height = img.height;
                
                const context = canvas.getContext('2d');
                
                // Очищуємо canvas
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                // Малюємо зображення на canvas
                context.drawImage(img, 0, 0);
                
                console.log('Зображення успішно намальовано на canvas');
                resolve(canvas);
            } catch (error) {
                reject(new Error('Помилка малювання на canvas: ' + error.message));
            }
        };
        
        img.onerror = function() {
            reject(new Error('Не вдалося завантажити зображення'));
        };
        
        // Створюємо URL для зображення
        const reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error('Помилка читання файлу'));
        };
        reader.readAsDataURL(file);
    });
}

// Скидання стану
function reset() {
    console.log('Скидання стану камери...');
    
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
    
    console.log('Стан камери скинуто');
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ініціалізація нативної камери...');
    
    // Налаштовуємо обробники подій
    if (captureBtn) {
        captureBtn.addEventListener('click', openCamera);
    }
    
    if (cameraInput) {
        cameraInput.addEventListener('change', handleFileSelect);
    }
    
    updateStatus('Готово до фото');
    
    // Додаємо можливість очищення результатів
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
    });
    
    console.log('Нативна камера готова!');
});

// Експорт для сумісності з іншими модулями
window.cameraModule = {
    reset: reset,
    updateStatus: updateStatus
};
