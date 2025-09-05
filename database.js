console.log('=== database.js ЗАВАНТАЖЕНО ===');

// Database Module - для збереження слів у IndexedDB
class DatabaseManager {
    constructor() {
        this.dbName = 'OCRWordsDB';
        this.dbVersion = 1;
        this.storeName = 'words';
        this.db = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('Ініціалізація бази даних...');
            this.db = await this.openDatabase();
            console.log('База даних готова!');
        } catch (error) {
            console.error('Помилка ініціалізації бази даних:', error);
        }
    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Не вдалося відкрити базу даних'));
            };

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Створюємо object store для слів
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = db.createObjectStore(this.storeName, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Створюємо індекси
                    objectStore.createIndex('word', 'word', { unique: false });
                    objectStore.createIndex('dateAdded', 'dateAdded', { unique: false });
                    objectStore.createIndex('practiceCount', 'practiceCount', { unique: false });
                    
                    console.log('Object store створено');
                }
            };
        });
    }

    async addWord(wordData) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            
            // Структура збереженого слова
            const wordRecord = {
                word: wordData.word,
                translation: wordData.translation || '',
                transcription: wordData.transcription || '',
                dateAdded: new Date(),
                practiceCount: 0,
                lastPracticed: null,
                difficulty: 'new', // new, easy, medium, hard
                source: 'ocr' // звідки додано слово
            };

            const request = objectStore.add(wordRecord);

            request.onsuccess = () => {
                console.log('Слово додано:', wordRecord.word);
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error('Помилка додавання слова'));
            };
        });
    }

    async addWords(words) {
        console.log('Додаємо слова до бази:', words);
        const results = [];
        
        for (const word of words) {
            try {
                // Перевіряємо чи слово вже існує
                const existing = await this.getWordByText(word);
                if (!existing) {
                    const result = await this.addWord({ word: word });
                    results.push({ word, status: 'added', id: result });
                } else {
                    results.push({ word, status: 'exists', id: existing.id });
                }
            } catch (error) {
                console.error('Помилка додавання слова:', word, error);
                results.push({ word, status: 'error', error: error.message });
            }
        }
        
        console.log('Результати додавання:', results);
        return results;
    }

    async getWordByText(wordText) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('word');
            
            const request = index.get(wordText.toLowerCase());

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error('Помилка пошуку слова'));
            };
        });
    }

    async getAllWords() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            
            const request = objectStore.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error('Помилка отримання слів'));
            };
        });
    }

    async updateWord(id, updates) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            
            // Спочатку отримуємо існуючий запис
            const getRequest = objectStore.get(id);
            
            getRequest.onsuccess = () => {
                const existingRecord = getRequest.result;
                if (!existingRecord) {
                    reject(new Error('Слово не знайдено'));
                    return;
                }
                
                // Оновлюємо поля
                const updatedRecord = { ...existingRecord, ...updates };
                
                const putRequest = objectStore.put(updatedRecord);
                
                putRequest.onsuccess = () => {
                    console.log('Слово оновлено:', updatedRecord.word);
                    resolve(updatedRecord);
                };
                
                putRequest.onerror = () => {
                    reject(new Error('Помилка оновлення слова'));
                };
            };
            
            getRequest.onerror = () => {
                reject(new Error('Помилка отримання слова'));
            };
        });
    }

    async deleteWord(id) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('Слово видалено, ID:', id);
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error('Помилка видалення слова'));
            };
        });
    }

    async getWordsForPractice(limit = 20) {
        const allWords = await this.getAllWords();
        
        // Сортуємо слова за пріоритетом вивчення
        const sortedWords = allWords.sort((a, b) => {
            // Спочатку нові слова
            if (a.practiceCount === 0 && b.practiceCount > 0) return -1;
            if (b.practiceCount === 0 && a.practiceCount > 0) return 1;
            
            // Потім за складністю
            const difficultyOrder = { 'hard': 0, 'medium': 1, 'easy': 2, 'new': 3 };
            const aDiff = difficultyOrder[a.difficulty] || 3;
            const bDiff = difficultyOrder[b.difficulty] || 3;
            
            if (aDiff !== bDiff) return aDiff - bDiff;
            
            // Нарешті за датою останнього повторення
            const aLast = a.lastPracticed ? new Date(a.lastPracticed) : new Date(0);
            const bLast = b.lastPracticed ? new Date(b.lastPracticed) : new Date(0);
            
            return aLast - bLast;
        });
        
        return sortedWords.slice(0, limit);
    }

    async getStats() {
        const allWords = await this.getAllWords();
        
        const stats = {
            total: allWords.length,
            new: allWords.filter(w => w.practiceCount === 0).length,
            easy: allWords.filter(w => w.difficulty === 'easy').length,
            medium: allWords.filter(w => w.difficulty === 'medium').length,
            hard: allWords.filter(w => w.difficulty === 'hard').length,
            withTranslation: allWords.filter(w => w.translation && w.translation.trim()).length
        };
        
        return stats;
    }

    async clearAllWords() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('Всі слова видалено');
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error('Помилка очищення бази даних'));
            };
        });
    }
}

// Створюємо глобальний екземпляр
console.log('Створюємо DatabaseManager...');
const databaseManager = new DatabaseManager();
console.log('DatabaseManager створено!');