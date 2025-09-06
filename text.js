console.log('=== text.js ЗАВАНТАЖЕНО ===');

// Text Processing Module - конвертація тексту в чіпси слів з попапом
class TextProcessor {
    constructor() {
        this.selectedWords = new Set();
        this.allWords = [];
        this.popupEl = null;
        this.popupChipsContainer = null;
        this.popupSaveBtn = null;
        this.popupBackBtn = null;
        
        this.init();
    }

    init() {
        console.log('TextProcessor ініціалізується...');
        this.setupPopupEventListeners();
        console.log('TextProcessor готовий!');
    }

    setupPopupEventListeners() {
        // Попап елементи
        this.popupEl = document.getElementById('words-popup');
        this.popupChipsContainer = document.getElementById('popup-word-chips');
        this.popupSaveBtn = document.getElementById('popup-save');
        this.popupBackBtn = document.getElementById('popup-back');

        // Кнопка "Зберегти"
        if (this.popupSaveBtn) {
            this.popupSaveBtn.addEventListener('click', () => this.saveSelectedWords());
        }

        // Кнопка "Назад"
        if (this.popupBackBtn) {
            this.popupBackBtn.addEventListener('click', () => this.closePopup());
        }

        // Закриття по кліку на overlay
        if (this.popupEl) {
            this.popupEl.addEventListener('click', (e) => {
                if (e.target === this.popupEl) {
                    this.closePopup();
                }
            });
        }

        // Закриття по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popupEl && this.popupEl.style.display !== 'none') {
                this.closePopup();
            }
        });
        
        console.log('Popup event listeners налаштовано');
    }

    processText(ocrResult) {
        console.log('=== ОБРОБКА ТЕКСТУ ===');
        console.log('textProcessor.processText викликано з:', ocrResult);
        
        if (!ocrResult || !ocrResult.words || ocrResult.words.length === 0) {
            console.log('Немає слів для обробки');
            return;
        }

        console.log('Є слова для обробки:', ocrResult.words);

        // Очищуємо попередні результати
        this.clearSelection();
        
        // Зберігаємо слова
        this.allWords = [...ocrResult.words];
        
        console.log('Слова для обробки збережено:', this.allWords);
        
        // Показуємо попап з чіпсами
        this.showPopup();
        
        console.log('processText завершено');
    }

    showPopup() {
        if (!this.popupEl || !this.popupChipsContainer) {
            console.error('Попап не знайдено');
            return;
        }

        // Створюємо чіпси в попапі
        this.createWordChips(this.allWords);
        
        // Показуємо попап
        this.popupEl.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Блокуємо скрол фону
        
        console.log('Попап показано з', this.allWords.length, 'словами');
    }

    hidePopup() {
        if (this.popupEl) {
            this.popupEl.style.display = 'none';
            document.body.style.overflow = ''; // Відновлюємо скрол
            console.log('Попап приховано');
        }
    }

    createWordChips(words) {
        if (!this.popupChipsContainer) {
            console.error('Контейнер чіпсів в попапі не знайдено');
            return;
        }
        
        console.log('Створення чіпсів для слів:', words);
        
        // Очищуємо контейнер
        this.popupChipsContainer.innerHTML = '';
        
        // Створюємо чіп для кожного слова
        words.forEach((word, index) => {
            const chip = this.createChip(word, index);
            this.popupChipsContainer.appendChild(chip);
        });
        
        console.log(`Створено ${words.length} чіпсів в попапі`);
    }

    createChip(word, index) {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.dataset.word = word;
        chip.dataset.index = index;
        
        chip.innerHTML = `
            <span class="chip-text">${word}</span>
            <span class="chip-check">✓</span>
        `;
        
        // Додаємо обробник кліку
        chip.addEventListener('click', () => this.toggleWordSelection(word, chip));
        
        return chip;
    }

    toggleWordSelection(word, chipElement) {
        if (this.selectedWords.has(word)) {
            // Знімаємо вибір
            this.selectedWords.delete(word);
            chipElement.classList.remove('selected');
            console.log('Знято вибір:', word);
        } else {
            // Додаємо до вибраних
            this.selectedWords.add(word);
            chipElement.classList.add('selected');
            console.log('Додано до вибраних:', word);
        }
        
        this.updateSaveButton();
        console.log('Обрані слова:', Array.from(this.selectedWords));
    }

    updateSaveButton() {
        const selectedCount = this.selectedWords.size;
        
        if (this.popupSaveBtn) {
            if (selectedCount > 0) {
                this.popupSaveBtn.disabled = false;
                this.popupSaveBtn.textContent = `Зберегти (${selectedCount})`;
            } else {
                this.popupSaveBtn.disabled = true;
                this.popupSaveBtn.textContent = 'Зберегти';
            }
        }
    }

    clearSelection() {
        this.selectedWords.clear();
        
        // Оновлюємо візуальний стан всіх чіпсів
        if (this.popupChipsContainer) {
            const chips = this.popupChipsContainer.querySelectorAll('.word-chip');
            chips.forEach(chip => chip.classList.remove('selected'));
        }
        
        this.updateSaveButton();
        console.log('Очищено вибір слів');
    }

    async saveSelectedWords() {
        const selectedWordsArray = Array.from(this.selectedWords);
        
        if (selectedWordsArray.length === 0) {
            console.log('Немає обраних слів для додавання');
            return;
        }
        
        console.log('=== ДОДАВАННЯ СЛІВ ===');
        console.log('Додаємо слова:', selectedWordsArray);
        
        try {
            // Зберігаємо слова в базу даних
            const results = await databaseManager.addWords(selectedWordsArray);
            
            // Підраховуємо результати
            const added = results.filter(r => r.status === 'added').length;
            const existing = results.filter(r => r.status === 'exists').length;
            const errors = results.filter(r => r.status === 'error').length;
            
            let message = '';
            if (added > 0) message += `Додано ${added} нових слів. `;
            if (existing > 0) message += `${existing} слів вже були в словнику. `;
            if (errors > 0) message += `${errors} помилок при додаванні.`;
            
            // Використовуємо уніфіковану функцію показу повідомлень
            this.showNotification(message || 'Слова оброблено', 'success');
            
            // Закриваємо попап і залишаємось на сторінці
            this.closePopup();
            
            // Оновлюємо відображення словника
            if (typeof flashcardsManager !== 'undefined') {
                flashcardsManager.refresh();
            }
            
            // Автоматично перекладаємо нові слова в фоновому режимі
            if (added > 0) {
                this.backgroundTranslateNewWords(selectedWordsArray);
            }
            
        } catch (error) {
            console.error('Помилка додавання слів:', error);
            this.showNotification('Помилка при збереженні слів', 'error');
        }
    }

    closePopup() {
        // Просто закриваємо попап без перенаправлення
        this.hidePopup();
        
        // Скидаємо OCR статус якщо є
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
        
        // Скидаємо camera-words статус якщо є
        if (typeof cameraWordsManager !== 'undefined') {
            cameraWordsManager.reset();
        }
    }

    async backgroundTranslateNewWords(newWords) {
        console.log('Фоновий переклад нових слів:', newWords);
        
        try {
            for (let i = 0; i < newWords.length; i++) {
                const word = newWords[i];
                
                try {
                    // Отримуємо слово з бази для перевірки чи потрібен переклад
                    const wordFromDB = await databaseManager.getWordByText(word);
                    
                    if (wordFromDB && (!wordFromDB.translation || wordFromDB.translation === 'Переклад недоступний')) {
                        const translation = await this.translateWord(word);
                        
                        // Оновлюємо переклад в базі
                        await databaseManager.updateWord(wordFromDB.id, {
                            translation: translation
                        });
                        
                        console.log(`Фоновий переклад завершено: ${word} -> ${translation}`);
                        
                        // Оновлюємо відображення словника після кожного перекладу
                        if (typeof flashcardsManager !== 'undefined') {
                            flashcardsManager.refresh();
                        }
                    }
                    
                } catch (error) {
                    console.error('Помилка фонового перекладу слова:', word, error);
                }
                
                // Затримка між запитами
                if (i < newWords.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
        } catch (error) {
            console.error('Помилка фонового перекладу:', error);
        }
    }

    async translateWord(word) {
        console.log('Перекладаємо слово через MyMemory API:', word);
        
        try {
            const encodedWord = encodeURIComponent(word.trim());
            const url = `https://api.mymemory.translated.net/get?q=${encodedWord}&langpair=en|uk&de=your.email@example.com`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.responseData) {
                const translation = data.responseData.translatedText;
                
                if (translation && 
                    translation.trim().length > 0 &&
                    translation.toLowerCase() !== word.toLowerCase() &&
                    !translation.includes('MYMEMORY WARNING')) {
                    
                    console.log(`API переклад: ${word} -> ${translation}`);
                    return translation.trim();
                }
            }
            
            throw new Error('Неякісний переклад');
            
        } catch (error) {
            console.error('Помилка перекладу:', word, error);
            return 'Помилка перекладу';
        }
    }

    // ======== УНІФІКОВАНІ ФУНКЦІЇ ПОКАЗУ ПОВІДОМЛЕНЬ ========

    showNotification(message, type = 'success') {
        // Створюємо уніфіковане повідомлення з чорним фоном і білим текстом
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Видаляємо через 3 секунди
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
        
        console.log(`Notification (${type}):`, message);
    }

    showSuccessMessage(message) {
        this.showNotification(message, 'success');
    }

    showErrorMessage(message) {
        this.showNotification(message, 'error');
    }

    reset() {
        this.clearSelection();
        this.hidePopup();
        this.allWords = [];
        console.log('TextProcessor скинуто');
    }

    getSelectedWords() {
        return Array.from(this.selectedWords);
    }
}

// Створюємо глобальний екземпляр обробника тексту
console.log('Створюємо TextProcessor...');
const textProcessor = new TextProcessor();
console.log('TextProcessor створено!');
