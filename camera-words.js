console.log('=== camera-words.js ЗАВАНТАЖЕНО ===');

// Camera Words Module - функціонал камери для сторінки словника
class CameraWordsManager {
    constructor() {
        this.photoInput = null;
        this.canvas = null;
        this.grabWordsBtn = null;
        this.statusEl = null;
        this.isProcessing = false;
        
        this.init();
    }

    init() {
        console.log('CameraWordsManager ініціалізується...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCameraWords());
        } else {
            this.setupCameraWords();
        }
        
        console.log('CameraWordsManager готовий!');
    }

    setupCameraWords() {
        // Отримуємо елементи
        this.photoInput = document.getElementById('photo-input');
        this.canvas = document.getElementById('canvas');
        this.grabWordsBtn = document.getElementById('grab-words');
        this.statusEl = document.getElementById('ocr-status');

        if (!this.photoInput || !this.canvas || !this.grabWordsBtn) {
            console.error('Не всі елементи камери знайдено');
            return;
        }

        // Налаштовуємо обробники подій
        this.setupEventListeners();
        
        console.log('Camera words налаштовано');
    }

    setupEventListeners() {
        // Кнопка Grab Words
        this.grabWordsBtn.addEventListener('click', () => this.openPhotoSelector());
        
        // Вибір фото
        this.photoInput.addEventListener('change', (e) => this.handlePhotoSelect(e));
        
        // Drag & Drop на всю сторінку
        this.setupDragAndDrop();
        
        console.log('Camera words event listeners налаштовано');
    }

    openPhotoSelector() {
        console.log('Відкриття вибору фото...');
        
        this.updateStatus('Виберіть фото або зробіть нове...', 'default');
        this.showStatus();
        
        // Відкриваємо file picker
        this.photoInput.click();
    }

    async handlePhotoSelect(event) {
        const file = event.target.files[0];
        
        if (!file) {
            console.log('Файл не вибрано');
            this.hideStatus();
            return;
        }
        
        console.log('Вибрано файл:', file.name, 'Розмір:', file.size, 'байт');
        
        if (!file.type.startsWith('image/')) {
            console.error('Вибраний файл не є зображенням');
            this.updateStatus('Будь ласка, виберіть зображення', 'error');
            setTimeout(() => this.hideStatus(), 3000);
            return;
        }
        
        try {
            await this.processPhoto(file);
        } catch (error) {
            console.error('Помилка обробки фото:', error);
            this.updateStatus('Помилка обробки фото', 'error');
            setTimeout(() => this.hideStatus(), 3000);
        } finally {
            // Очищуємо input для можливості вибрати той же файл знову
            this.photoInput.value = '';
        }
    }

    async processPhoto(file) {
        if (this.isProcessing) {
            console.log('Обробка вже відбувається...');
            return;
        }

        console.log('=== ОБРОБКА ФОТО ===');
        
        try {
            this.isProcessing = true;
            this.grabWordsBtn.disabled = true;
            this.grabWordsBtn.textContent = 'Обробка...';
            
            this.updateStatus('Завантаження фото...', 'processing');
            
            // Створюємо об'єкт Image для завантаження
            const img = new Image();
            
            // Обробляємо зображення після завантаження
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    try {
                        console.log('Фото завантажено:', img.width, 'x', img.height);
                        
                        // Встановлюємо розміри canvas відповідно до зображення
                        this.canvas.width = img.width;
                        this.canvas.height = img.height;
                        
                        const context = this.canvas.getContext('2d');
                        
                        // Малюємо зображення на canvas
                        context.drawImage(img, 0, 0);
                        
                        console.log('=== ДЕТАЛЬНА ІНФОРМАЦІЯ ===');
                        console.log('Розміри фото:', img.width, 'x', img.height);
                        console.log('Canvas розміри:', this.canvas.width, 'x', this.canvas.height);
                        console.log('Мегапікселі:', (img.width * img.height / 1000000).toFixed(2), 'MP');
                        console.log('Розмір файлу:', (file.size / 1024).toFixed(2), 'KB');
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    reject(new Error('Не вдалося завантажити фото'));
                };
                
                // Запускаємо завантаження зображення
                img.src = URL.createObjectURL(file);
            });
            
            // Запускаємо OCR обробку
            if (typeof ocrProcessor !== 'undefined') {
                this.updateStatus('Розпізнавання тексту...', 'processing');
                await ocrProcessor.processImage(this.canvas);
            } else {
                console.error('OCR процесор не доступний');
                throw new Error('OCR процесор не знайдено');
            }
            
            console.log('=== ФОТО ОБРОБЛЕНО ===');
            
        } catch (error) {
            console.error('Помилка обробки фото:', error);
            this.updateStatus('Помилка обробки фото', 'error');
            throw error;
        } finally {
            this.isProcessing = false;
            this.grabWordsBtn.disabled = false;
            this.grabWordsBtn.textContent = 'Grab words';
            
            // Ховаємо статус через деякий час якщо не було помилки
            setTimeout(() => {
                if (this.statusEl && !this.statusEl.classList.contains('error')) {
                    this.hideStatus();
                }
            }, 2000);
        }
    }

    setupDragAndDrop() {
        const dropZone = document.body;
        
        // Запобігаємо стандартній поведінці браузера
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Додаємо візуальний фідбек при перетягуванні
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.highlightDropZone(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.unhighlightDropZone(), false);
        });
        
        // Обробляємо dropped файли
        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        console.log('Drag & drop налаштовано');
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlightDropZone() {
        document.body.style.backgroundColor = 'rgba(1, 245, 95, 0.1)';
        this.updateStatus('Відпустіть фото для обробки...', 'processing');
        this.showStatus();
    }

    unhighlightDropZone() {
        document.body.style.backgroundColor = '';
        if (!this.isProcessing) {
            this.hideStatus();
        }
    }

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            console.log('Файл перетягнуто:', file.name);
            
            if (file.type.startsWith('image/')) {
                this.handlePhotoSelect({ target: { files: [file] } });
            } else {
                console.error('Перетягнутий файл не є зображенням');
                this.updateStatus('Будь ласка, перетягніть зображення', 'error');
                setTimeout(() => this.hideStatus(), 3000);
            }
        }
    }

    updateStatus(message, type = 'default') {
        if (this.statusEl) {
            const statusText = this.statusEl.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = message;
            }
            
            // Оновлюємо класи
            this.statusEl.className = `ocr-status ${type}`;
            
            console.log(`OCR Status (${type}):`, message);
        }
        
        // Також оновлюємо OCR процесор якщо доступний
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.updateStatus(message, type);
        }
    }

    showStatus() {
        if (this.statusEl) {
            this.statusEl.style.display = 'block';
        }
    }

    hideStatus() {
        if (this.statusEl) {
            this.statusEl.style.display = 'none';
        }
    }

    // Публічні методи для використання з інших модулів

    reset() {
        this.hideStatus();
        this.isProcessing = false;
        this.grabWordsBtn.disabled = false;
        this.grabWordsBtn.textContent = 'Grab words';
        console.log('CameraWordsManager скинуто');
    }

    isProcessingPhoto() {
        return this.isProcessing;
    }
}

// Створюємо глобальний екземпляр
console.log('Створюємо CameraWordsManager...');
const cameraWordsManager = new CameraWordsManager();
console.log('CameraWordsManager створено!');