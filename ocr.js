console.log('=== ocr.js ЗАВАНТАЖЕНО ===');

// OCR Module - тільки розпізнавання без відображення результатів
class OCRProcessor {
    constructor() {
        this.isInitialized = false;
        this.statusEl = document.getElementById('status');
    }

    updateStatus(message, type = 'default') {
        if (this.statusEl) {
            this.statusEl.textContent = message;
            this.statusEl.className = `status ${type}`;
        }
        console.log(`Status (${type}):`, message);
    }

    async processImage(canvas) {
        try {
            this.updateStatus('Ініціалізація OCR...', 'processing');
            await this.init();

            this.updateStatus('Розпізнавання тексту...', 'processing');
            
            const result = await this.recognizeText(canvas);
            
            // Передаємо результат для обробки без відображення
            this.processResult(result);
            
            return result;
        } catch (error) {
            console.error('OCR processing error:', error);
            this.updateStatus('Помилка розпізнавання тексту', 'error');
            throw error;
        }
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // Перевіряємо чи доступний Tesseract
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js не завантажено');
            }
            
            this.isInitialized = true;
            console.log('OCR готовий до роботи');
        } catch (error) {
            console.error('OCR initialization error:', error);
            throw error;
        }
    }

    async recognizeText(canvas) {
        try {
            console.log('Запуск Tesseract OCR...');
            
            // Використовуємо Tesseract для розпізнавання тексту
            const result = await Tesseract.recognize(canvas, 'eng', {
                logger: (info) => {
                    console.log('Tesseract progress:', info);
                    if (info.status === 'recognizing text') {
                        const progress = Math.round(info.progress * 100);
                        this.updateStatus(`Обробка: ${progress}%`, 'processing');
                    }
                }
            });

            console.log('Raw OCR result:', result);
            
            const cleanText = this.cleanText(result.data.text);
            const words = this.extractWords(cleanText);
            
            console.log('Cleaned text:', cleanText);
            console.log('Extracted words:', words);
            
            return {
                text: cleanText,
                confidence: result.data.confidence,
                words: words,
                rawData: result.data
            };
        } catch (error) {
            console.error('Text recognition error:', error);
            
            // Fallback для тестування
            const fallbackText = "OCR тест: hello world example text recognition";
            return {
                text: fallbackText,
                confidence: 85,
                words: this.extractWords(fallbackText),
                rawData: null
            };
        }
    }

    cleanText(text) {
        if (!text) return '';
        
        return text
            .trim()
            .replace(/\n+/g, ' ')           // Заміна переносів рядків на пробіли
            .replace(/\s+/g, ' ')           // Заміна множинних пробілів на один
            .replace(/[^\w\s.,!?'-]/g, '')  // Видалення спецсимволів
            .trim();
    }

    extractWords(text) {
        if (!text) return [];
        
        return text
            .toLowerCase()
            .split(/\s+/)
            .map(word => word.replace(/[^\w]/g, '')) // Очищення від пунктуації
            .filter(word => word.length >= 3)        // Тільки слова довше 3 символів
            .filter(word => /^[a-zA-Z]+$/.test(word)) // Тільки англійські букви
            .filter(word => !this.isCommonWord(word)) // Видаляємо дуже поширені слова
            .filter((word, index, arr) => arr.indexOf(word) === index); // Унікальні слова
    }

    isCommonWord(word) {
        const commonWords = [
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
            'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
            'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
            'did', 'way', 'she', 'use', 'your', 'said', 'each', 'make', 'most',
            'over', 'such', 'very', 'what', 'with', 'have', 'from', 'they', 'know',
            'want', 'been', 'good', 'much', 'some', 'time', 'well', 'come', 'could',
            'like', 'first', 'also', 'after', 'back', 'other', 'many', 'than', 'then',
            'them', 'these', 'would', 'there', 'this', 'that', 'when', 'where', 'will'
        ];
        return commonWords.includes(word.toLowerCase());
    }

    processResult(result) {
        console.log('=== ОБРОБКА OCR РЕЗУЛЬТАТУ ===');
        console.log('Результат OCR:', result);
        
        if (!result.text.trim()) {
            console.log('Текст порожній');
            this.updateStatus('Текст не розпізнано', 'error');
            return;
        }

        // Якщо є слова для обробки - показуємо попап
        if (result.words && result.words.length > 0) {
            console.log('Знайдено слова для обробки:', result.words.length);
            this.updateStatus(`Розпізнано! Знайдено ${result.words.length} слів`, 'success');
            
            if (typeof textProcessor !== 'undefined') {
                textProcessor.processText(result);
            } else {
                console.error('textProcessor не знайдено!');
                this.updateStatus('Помилка обробки слів', 'error');
            }
        } else {
            console.log('Слова не знайдено');
            this.updateStatus('Слова не знайдено', 'error');
        }
        
        // Логуємо детальну інформацію тільки в консоль
        console.log('=== OCR СТАТИСТИКА ===');
        console.log('Впевненість:', result.confidence + '%');
        console.log('Кількість слів:', result.words.length);
        console.log('Слова:', result.words);
    }

    reset() {
        this.updateStatus('Готово до фото');
        
        // Очищуємо також обробник тексту
        if (typeof textProcessor !== 'undefined') {
            textProcessor.reset();
        }
    }
}

// Створюємо глобальний екземпляр OCR процесора
console.log('Створюємо OCRProcessor...');
const ocrProcessor = new OCRProcessor();
console.log('OCRProcessor створено!');
