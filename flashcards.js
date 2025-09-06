console.log('=== flashcards.js ЗАВАНТАЖЕНО ===');

// Dictionary Module - спрощений без HTML розмітки
class DictionaryManager {
    constructor() {
        this.translationInProgress = false;
        this.init();
    }

    init() {
        console.log('DictionaryManager ініціалізується...');
        
        // Чекаємо поки DOM завантажиться
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDictionary());
        } else {
            this.setupDictionary();
        }
        
        console.log('DictionaryManager готовий!');
    }

    setupDictionary() {
        // Налаштовуємо обробники подій
        this.setupEventListeners();
        
        // Запускаємо ініціальні процеси
        this.updateWordsCount();
        this.autoTranslateAllWords();
        
        console.log('Словник налаштовано');
    }

    setupEventListeners() {
        // Обробник для кнопки налаштувань
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                console.log('Settings clicked');
                this.showSettingsMenu();
            });
        }
    }

    showSettingsMenu() {
        // Створюємо меню налаштувань
        this.createSettingsMenu();
    }

    createSettingsMenu() {
        // Створюємо overlay
        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';

        // Створюємо меню
        const menu = document.createElement('div');
        menu.className = 'settings-menu';

        // Заголовок
        const title = document.createElement('h3');
        title.textContent = 'Налаштування';
        title.style.cssText = `
            margin: 0 0 var(--space-lg) 0;
            font-size: var(--font-24);
            font-weight: var(--font-semibold);
            color: var(--black);
            text-align: center;
        `;

        // Кнопка "Скачати словник"
        const exportBtn = document.createElement('button');
        exportBtn.className = 'settings-option';
        exportBtn.textContent = 'Скачати словник';

        // Кнопка "Видалити всі слова"
        const clearBtn = document.createElement('button');
        clearBtn.className = 'settings-option danger';
        clearBtn.textContent = 'Видалити всі слова';

        // Кнопка "Скасувати"
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'settings-option';
        cancelBtn.textContent = 'Скасувати';

        // Обробники подій
        exportBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
            this.exportDictionary();
        });

        clearBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
            this.clearAllWords();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
        });

        // Закриття по кліку на overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeSettingsMenu(overlay);
            }
        });

        // Збираємо меню
        menu.appendChild(title);
        menu.appendChild(exportBtn);
        menu.appendChild(clearBtn);
        menu.appendChild(cancelBtn);
        overlay.appendChild(menu);

        // Додаємо в DOM
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
    }

    closeSettingsMenu(overlay) {
        if (overlay && overlay.parentNode) {
            const menu = overlay.querySelector('.settings-menu');
            if (menu) {
                menu.style.animation = 'slideDown 0.3s ease';
            }
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 300);
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

    showDeleteMessage(message, type = 'success') {
        // Використовуємо ту ж уніфіковану функцію
        this.showNotification(message, type);
    }

    // ======== ФУНКЦІЇ ПЕРЕКЛАДУ ========

    async autoTranslateAllWords() {
        if (this.translationInProgress) {
            console.log('Переклад вже відбувається...');
            return;
        }

        try {
            this.translationInProgress = true;
            console.log('Автоматична перевірка перекладів...');
            
            const allWords = await databaseManager.getAllWords();
            const wordsToTranslate = allWords.filter(word => 
                !word.translation || 
                !word.translation.trim() || 
                word.translation.startsWith('[переклад:') ||
                word.translation === 'Помилка перекладу' ||
                word.translation === 'Переклад недоступний'
            );
            
            console.log(`Знайдено ${wordsToTranslate.length} слів без перекладу`);
            
            if (wordsToTranslate.length > 0) {
                this.updateTranslationStatus(`Фоновий переклад: ${wordsToTranslate.length} слів...`);
                
                for (let i = 0; i < wordsToTranslate.length; i++) {
                    const word = wordsToTranslate[i];
                    
                    this.updateTranslationStatus(`Фоновий переклад: ${word.word} (${i + 1}/${wordsToTranslate.length})`);
                    
                    try {
                        const translation = await this.translateWord(word.word);
                        
                        await databaseManager.updateWord(word.id, {
                            translation: translation
                        });
                        
                        console.log(`Фоновий переклад: ${word.word} -> ${translation}`);
                        
                        // Оновлюємо відображення словника після кожного перекладу
                        this.updateWordsCount();
                        this.showAllWords();
                        
                    } catch (error) {
                        console.error('Помилка фонового перекладу:', word.word, error);
                        await databaseManager.updateWord(word.id, {
                            translation: 'Помилка перекладу'
                        });
                    }
                    
                    // Затримка між запитами
                    if (i < wordsToTranslate.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 400));
                    }
                }
                
                this.updateTranslationStatus('Фоновий переклад завершено!');
                setTimeout(() => this.hideTranslationStatus(), 2000);
            }
            
        } catch (error) {
            console.error('Помилка автоматичного перекладу:', error);
            this.hideTranslationStatus();
        } finally {
            this.translationInProgress = false;
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
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.responseStatus === 200 && data.responseData) {
                const translation = data.responseData.translatedText;
                
                if (translation && 
                    translation.trim().length > 0 &&
                    translation.toLowerCase() !== word.toLowerCase() &&
                    !translation.includes('MYMEMORY WARNING') &&
                    !translation.includes('API LIMIT EXCEEDED') &&
                    !translation.includes('NO QUERY SPECIFIED')) {
                    
                    console.log(`MyMemory API успіх: ${word} -> ${translation}`);
                    return translation.trim();
                } else {
                    console.log('Неякісний переклад:', translation);
                    throw new Error('Неякісний переклад від API');
                }
            } else {
                console.log('API повернув помилку:', data);
                throw new Error(`API Error: ${data.responseStatus || 'Unknown'}`);
            }
            
        } catch (error) {
            console.error('MyMemory API помилка для слова', word, ':', error.message);
            throw new Error(`Не вдалося перекласти слово "${word}": ${error.message}`);
        }
    }

    async updateWordsCount() {
        try {
            const stats = await databaseManager.getStats();
            const countEl = document.getElementById('words-count');
            
            if (countEl) {
                const wordText = stats.total === 1 ? 'word' : 'words';
                countEl.textContent = `${stats.total} ${wordText}`;
            }

            this.showAllWords();
        } catch (error) {
            console.error('Помилка оновлення лічильника слів:', error);
        }
    }

    async showAllWords() {
        try {
            const allWords = await databaseManager.getAllWords();
            const sortedWords = allWords.sort((a, b) => a.word.localeCompare(b.word));

            const wordsListEl = document.getElementById('words-list');
            if (wordsListEl) {
                if (sortedWords.length === 0) {
                    wordsListEl.innerHTML = `
                        <div class="no-words-message">
                            <p>Словник порожній</p>
                            <p>Додайте слова через камеру та OCR</p>
                        </div>
                    `;
                } else {
                    wordsListEl.innerHTML = sortedWords.map(word => {
                        const translation = word.translation || 'Переклад недоступний';
                        const isTranslating = translation === 'Переклад недоступний' || 
                                            translation === 'Помилка перекладу' ||
                                            translation.startsWith('[переклад:');
                        
                        return `
                            <div class="word-item ${isTranslating ? 'translating' : ''}" data-word-id="${word.id}">
                                <div class="word-content">
                                    <div class="word">${word.word}</div>
                                    <div class="translation">${translation}</div>
                                </div>
                                <button class="word-delete-btn" data-word-id="${word.id}" title="Видалити слово">
                                    <img src="icons/Trash Bin Trash.svg" alt="Delete" width="20" height="20">
                                </button>
                            </div>
                        `;
                    }).join('');
                    
                    // Додаємо обробники для кнопок видалення
                    this.setupDeleteButtons();
                }
            }
        } catch (error) {
            console.error('Помилка показу слів:', error);
        }
    }

    setupDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.word-delete-btn');
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Запобігаємо всплиттю події
                const wordId = parseInt(button.dataset.wordId);
                const wordElement = button.closest('.word-item');
                const wordText = wordElement.querySelector('.word').textContent;
                
                this.handleDeleteWord(wordId, wordText);
            });
        });
    }

    async handleDeleteWord(wordId, wordText) {
        // Підтвердження видалення
        const confirmed = confirm(`Ви впевнені, що хочете видалити слово "${wordText}"?`);
        
        if (!confirmed) {
            return;
        }

        try {
            console.log(`Видалення слова: ${wordText} (ID: ${wordId})`);
            
            // Перевіряємо чи існує слово перед видаленням
            const existingWord = await databaseManager.getAllWords();
            const wordExists = existingWord.find(w => w.id === wordId);
            
            if (!wordExists) {
                console.error('Слово не знайдено в базі даних');
                this.showErrorMessage(`Слово "${wordText}" не знайдено`);
                return;
            }
            
            // Видаляємо з бази даних
            await databaseManager.deleteWord(wordId);
            
            // Перевіряємо чи справді видалено
            const remainingWords = await databaseManager.getAllWords();
            const stillExists = remainingWords.find(w => w.id === wordId);
            
            if (stillExists) {
                console.error('Слово не було видалено з бази даних');
                this.showErrorMessage(`Помилка видалення слова "${wordText}"`);
                return;
            }
            
            // Показуємо повідомлення про успіх
            this.showSuccessMessage(`Слово "${wordText}" видалено`);
            
            // Оновлюємо відображення
            this.refresh();
            
            console.log(`Слово "${wordText}" успішно видалено назавжди`);
            
        } catch (error) {
            console.error('Помилка видалення слова:', error);
            this.showErrorMessage(`Помилка видалення слова "${wordText}"`);
        }
    }

    updateTranslationStatus(message) {
        const statusEl = document.getElementById('translation-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.display = 'block';
            console.log('Translation status:', message);
        }
    }

    hideTranslationStatus() {
        const statusEl = document.getElementById('translation-status');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }

    // Публічні методи для використання з інших модулів

    // Метод для оновлення словника з зовні
    refresh() {
        console.log('Оновлення словника...');
        this.updateWordsCount();
    }

    // Метод для додавання слів
    async addWords(words) {
        if (!words || words.length === 0) {
            console.log('Немає слів для додавання');
            return [];
        }

        try {
            const results = await databaseManager.addWords(words);
            
            // Підраховуємо результати
            const added = results.filter(r => r.status === 'added').length;
            const existing = results.filter(r => r.status === 'exists').length;
            
            console.log(`Додано ${added} нових слів, ${existing} вже існували`);
            
            // Оновлюємо відображення
            this.refresh();
            
            // Запускаємо фоновий переклад для нових слів
            if (added > 0) {
                setTimeout(() => this.autoTranslateAllWords(), 1000);
            }
            
            return results;
            
        } catch (error) {
            console.error('Помилка додавання слів:', error);
            throw error;
        }
    }

    // Метод для видалення слова
    async deleteWord(id) {
        try {
            await databaseManager.deleteWord(id);
            console.log('Слово видалено, ID:', id);
            this.refresh();
            return true;
        } catch (error) {
            console.error('Помилка видалення слова:', error);
            throw error;
        }
    }

    // Метод для очищення всього словника
    async clearAllWords() {
        if (!confirm('Ви впевнені, що хочете видалити всі слова зі словника?')) {
            return false;
        }

        try {
            await databaseManager.clearAllWords();
            console.log('Всі слова видалено');
            this.showSuccessMessage('Всі слова видалено зі словника');
            this.refresh();
            return true;
        } catch (error) {
            console.error('Помилка очищення словника:', error);
            this.showErrorMessage('Помилка очищення словника');
            throw error;
        }
    }

    // Метод для пошуку слів
    async searchWords(query) {
        try {
            const allWords = await databaseManager.getAllWords();
            
            if (!query || query.trim() === '') {
                return allWords;
            }
            
            const searchTerm = query.toLowerCase().trim();
            return allWords.filter(word => 
                word.word.toLowerCase().includes(searchTerm) ||
                (word.translation && word.translation.toLowerCase().includes(searchTerm))
            );
            
        } catch (error) {
            console.error('Помилка пошуку слів:', error);
            return [];
        }
    }

    // Метод для отримання статистики
    async getStats() {
        try {
            return await databaseManager.getStats();
        } catch (error) {
            console.error('Помилка отримання статистики:', error);
            return {
                total: 0,
                new: 0,
                withTranslation: 0
            };
        }
    }

    // Метод для примусового перекладу конкретного слова
    async retranslateWord(wordId) {
        try {
            const word = await databaseManager.getWordById(wordId);
            if (!word) {
                throw new Error('Слово не знайдено');
            }

            this.updateTranslationStatus(`Перекладаємо: ${word.word}...`);
            
            const translation = await this.translateWord(word.word);
            
            await databaseManager.updateWord(wordId, {
                translation: translation
            });
            
            console.log(`Переклад оновлено: ${word.word} -> ${translation}`);
            
            this.hideTranslationStatus();
            this.refresh();
            
            return translation;
            
        } catch (error) {
            console.error('Помилка перекладу слова:', error);
            this.hideTranslationStatus();
            throw error;
        }
    }

    // Метод для експорту словника
    async exportDictionary() {
        try {
            const allWords = await databaseManager.getAllWords();
            
            if (allWords.length === 0) {
                this.showErrorMessage('Словник порожній');
                return false;
            }
            
            const dataStr = JSON.stringify(allWords, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `dictionary_${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.showSuccessMessage(`Словник експортовано (${allWords.length} слів)`);
            console.log('Словник експортовано');
            return true;
            
        } catch (error) {
            console.error('Помилка експорту словника:', error);
            this.showErrorMessage('Помилка експорту словника');
            throw error;
        }
    }

    // Метод для перевірки стану перекладу
    isTranslating() {
        return this.translationInProgress;
    }
}

// Створюємо глобальний екземпляр
console.log('Створюємо DictionaryManager...');
const flashcardsManager = new DictionaryManager();
console.log('DictionaryManager створено!');
