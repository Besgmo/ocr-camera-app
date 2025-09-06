let canvas = document.getElementById('canvas');
let captureBtn = document.getElementById('capture');
let fileInput = null;
let isProcessing = false;

// Створення прихованого input для вибору файлів
function createFileInput() {
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.capture = 'environment'; // Відкриває камеру на мобільних пристроях
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        // Обробник вибору файлу
        fileInput.addEventListener('change', handleFileSelect);
    }
}

// Обробка вибраного файлу
async function handleFileSelect(event) {
    const file = event.target.files[0];
    
    if (!file) {
        console.log('Файл не вибрано');
        return;
    }
    
    console.log('Вибрано файл:', file.name, 'Розмір:', file.size, 'байт');
    
    if (!file.type.startsWith('image/')) {
        console.error('Вибраний файл не є зображенням');
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.updateStatus('Будь ласка, виберіть зображення', 'error');
        }
        return;
    }
    
    try {
        // Обробляємо зображення
        await processSelectedImage(file);
    } catch (error) {
        console.error('Помилка обробки файлу:', error);
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.updateStatus('Помилка обробки зображення', 'error');
        }
    } finally {
        // Очищуємо input для можливості вибрати той же файл знову
        fileInput.value = '';
    }
}

// Обробка зображення та запуск OCR
async function processSelectedImage(file) {
    if (isProcessing) {
        console.log('Обробка вже відбувається...');
        return;
    }

    console.log('=== ОБРОБКА ЗОБРАЖЕННЯ ===');
    
    try {
        isProcessing = true;
        captureBtn.disabled = true;
        captureBtn.textContent = 'Обробка...';
        
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.updateStatus('Завантаження зображення...', 'processing');
        }
        
        // Створюємо об'єкт Image для завантаження
        const img = new Image();
        
        // Обробляємо зображення після завантаження
        await new Promise((resolve, reject) => {
            img.onload = () => {
                try {
                    console.log('Зображення завантажено:', img.width, 'x', img.height);
                    
                    // Встановлюємо розміри canvas відповідно до зображення
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    const context = canvas.getContext('2d');
                    
                    // Малюємо зображення на canvas
                    context.drawImage(img, 0, 0);
                    
                    console.log('=== ДЕТАЛЬНА ІНФОРМАЦІЯ ===');
                    console.log('Розміри зображення:', img.width, 'x', img.height);
                    console.log('Canvas розміри:', canvas.width, 'x', canvas.height);
                    console.log('Мегапікселі:', (img.width * img.height / 1000000).toFixed(2), 'MP');
                    console.log('Розмір файлу:', (file.size / 1024).toFixed(2), 'KB');
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => {
                reject(new Error('Не вдалося завантажити зображення'));
            };
            
            // Запускаємо завантаження зображення
            img.src = URL.createObjectURL(file);
        });
        
        // Запускаємо OCR обробку
        if (typeof ocrProcessor !== 'undefined') {
            await ocrProcessor.processImage(canvas);
        } else {
            console.error('OCR процесор не доступний');
            throw new Error('OCR процесор не знайдено');
        }
        
        console.log('=== ЗОБРАЖЕННЯ ОБРОБЛЕНО ===');
        
    } catch (error) {
        console.error('Помилка обробки зображення:', error);
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.updateStatus('Помилка обробки зображення', 'error');
        }
        throw error;
    } finally {
        isProcessing = false;
        captureBtn.disabled = false;
        captureBtn.textContent = 'Додати фото';
    }
}

// Функція для відкриття вибору файлу
function openFileSelector() {
    if (!fileInput) {
        createFileInput();
    }
    
    console.log('Відкриття вибору файлу...');
    
    if (typeof ocrProcessor !== 'undefined') {
        ocrProcessor.updateStatus('Виберіть зображення...', 'default');
    }
    
    fileInput.click();
}

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('Ініціалізація додатку для завантаження фото...');
    
    // Створюємо file input
    createFileInput();
    
    // Додаємо обробник кнопки (замість фото з камери - вибір файлу)
    if (captureBtn) {
        captureBtn.addEventListener('click', openFileSelector);
        captureBtn.textContent = 'Додати фото';
    }
    
    // Додаємо можливість drag & drop (бонус функціонал)
    setupDragAndDrop();
    
    // Додаємо можливість очищення результатів
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
    });
    
    // Оновлюємо статус
    if (typeof ocrProcessor !== 'undefined') {
        ocrProcessor.updateStatus('Готово до вибору фото');
    }
    
    console.log('Додаток готовий для завантаження фото!');
});

// Додатковий функціонал: Drag & Drop
function setupDragAndDrop() {
    const dropZone = document.body;
    
    // Запобігаємо стандартній поведінці браузера
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Додаємо візуальний фідбек при перетягуванні
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
        dropZone.style.backgroundColor = 'rgba(1, 245, 95, 0.1)';
    }
    
    function unhighlight(e) {
        dropZone.style.backgroundColor = '';
    }
    
    // Обробляємо dropped файли
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            console.log('Файл перетягнуто:', file.name);
            
            // Імітуємо вибір файлу
            if (file.type.startsWith('image/')) {
                handleFileSelect({ target: { files: [file] } });
            } else {
                console.error('Перетягнутий файл не є зображенням');
                if (typeof ocrProcessor !== 'undefined') {
                    ocrProcessor.updateStatus('Будь ласка, перетягніть зображення', 'error');
                }
            }
        }
    }
}