console.log('=== text.js LOADED ===');

// Text Processing Module - text conversion to word chips with popup
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
        console.log('TextProcessor initializing...');
        this.setupPopupEventListeners();
        console.log('TextProcessor ready!');
    }

    setupPopupEventListeners() {
        // Popup elements
        this.popupEl = document.getElementById('words-popup');
        this.popupChipsContainer = document.getElementById('popup-word-chips');
        this.popupSaveBtn = document.getElementById('popup-save');
        this.popupBackBtn = document.getElementById('popup-back');

        // "Save" button
        if (this.popupSaveBtn) {
            this.popupSaveBtn.addEventListener('click', () => this.saveSelectedWords());
        }

        // "Back" button
        if (this.popupBackBtn) {
            this.popupBackBtn.addEventListener('click', () => this.closePopup());
        }

        // Close on overlay click
        if (this.popupEl) {
            this.popupEl.addEventListener('click', (e) => {
                if (e.target === this.popupEl) {
                    this.closePopup();
                }
            });
        }

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.popupEl && this.popupEl.style.display !== 'none') {
                this.closePopup();
            }
        });
        
        console.log('Popup event listeners configured');
    }

    processText(ocrResult) {
        console.log('=== TEXT PROCESSING ===');
        console.log('textProcessor.processText called with:', ocrResult);
        
        if (!ocrResult || !ocrResult.words || ocrResult.words.length === 0) {
            console.log('No words to process');
            return;
        }

        console.log('There are words to process:', ocrResult.words);

        // Clear previous results
        this.clearSelection();
        
        // Save words
        this.allWords = [...ocrResult.words];
        
        console.log('Words for processing saved:', this.allWords);
        
        // Show popup with chips
        this.showPopup();
        
        console.log('processText completed');
    }

    showPopup() {
        if (!this.popupEl || !this.popupChipsContainer) {
            console.error('Popup not found');
            return;
        }

        // Create chips in popup
        this.createWordChips(this.allWords);
        
        // Show popup
        this.popupEl.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Block background scroll
        
        console.log('Popup shown with', this.allWords.length, 'words');
    }

    hidePopup() {
        if (this.popupEl) {
            this.popupEl.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
            console.log('Popup hidden');
        }
    }

    createWordChips(words) {
        if (!this.popupChipsContainer) {
            console.error('Chips container in popup not found');
            return;
        }
        
        console.log('Creating chips for words:', words);
        
        // Clear container
        this.popupChipsContainer.innerHTML = '';
        
        // Create chip for each word
        words.forEach((word, index) => {
            const chip = this.createChip(word, index);
            this.popupChipsContainer.appendChild(chip);
        });
        
        console.log(`Created ${words.length} chips in popup`);
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
        
        // Add click handler
        chip.addEventListener('click', () => this.toggleWordSelection(word, chip));
        
        return chip;
    }

    toggleWordSelection(word, chipElement) {
        if (this.selectedWords.has(word)) {
            // Deselect
            this.selectedWords.delete(word);
            chipElement.classList.remove('selected');
            console.log('Deselected:', word);
            
            // М'яка вібрація при відміні вибору
            if (typeof hapticManager !== 'undefined') {
                hapticManager.customVibration('light', 20);
            }
        } else {
            // Add to selected
            this.selectedWords.add(word);
            chipElement.classList.add('selected');
            console.log('Added to selected:', word);
            
            // Вібрація при виборі слова
            if (typeof hapticManager !== 'undefined') {
                hapticManager.wordSelected();
            }
        }
        
        this.updateSaveButton();
        console.log('Selected words:', Array.from(this.selectedWords));
    }

    updateSaveButton() {
        const selectedCount = this.selectedWords.size;
        
        if (this.popupSaveBtn) {
            if (selectedCount > 0) {
                this.popupSaveBtn.disabled = false;
                this.popupSaveBtn.textContent = `Save (${selectedCount})`;
            } else {
                this.popupSaveBtn.disabled = true;
                this.popupSaveBtn.textContent = 'Save';
            }
        }
    }

    clearSelection() {
        this.selectedWords.clear();
        
        // Update visual state of all chips
        if (this.popupChipsContainer) {
            const chips = this.popupChipsContainer.querySelectorAll('.word-chip');
            chips.forEach(chip => chip.classList.remove('selected'));
        }
        
        this.updateSaveButton();
        console.log('Word selection cleared');
    }

    async saveSelectedWords() {
        const selectedWordsArray = Array.from(this.selectedWords);
        
        if (selectedWordsArray.length === 0) {
            console.log('No selected words to add');
            return;
        }
        
        console.log('=== ADDING WORDS ===');
        console.log('Adding words:', selectedWordsArray);
        
        try {
            // Save words to database
            const results = await databaseManager.addWords(selectedWordsArray);
            
            // Count results
            const added = results.filter(r => r.status === 'added').length;
            const existing = results.filter(r => r.status === 'exists').length;
            const errors = results.filter(r => r.status === 'error').length;
            
            let message = '';
            if (added > 0) message += `Added ${added} new words. `;
            if (existing > 0) message += `${existing} words were already in dictionary. `;
            if (errors > 0) message += `${errors} errors while adding.`;
            
            // Вібрація залежно від результату
            if (typeof hapticManager !== 'undefined') {
                if (added > 0) {
                    // Адаптивна вібрація залежно від кількості доданих слів
                    hapticManager.wordsAdded(added);
                } else if (existing > 0 && errors === 0) {
                    // М'яка вібрація для існуючих слів (не помилка)
                    hapticManager.select();
                } else if (errors > 0) {
                    // Помилка при додаванні
                    hapticManager.error();
                }
            }
            
            // Use unified message display function
            this.showNotification(message || 'Words processed', added > 0 || existing > 0 ? 'success' : 'error');
            
            // Close popup and stay on page
            this.closePopup();
            
            // Update dictionary display
            if (typeof flashcardsManager !== 'undefined') {
                flashcardsManager.refresh();
            }
            
            // Automatically translate new words in background
            if (added > 0) {
                this.backgroundTranslateNewWords(selectedWordsArray);
            }
            
        } catch (error) {
            console.error('Error adding words:', error);
            this.showNotification('Error while saving words', 'error');
            
            // Вібрація помилки
            if (typeof hapticManager !== 'undefined') {
                hapticManager.error();
            }
        }
    }

    closePopup() {
        // Simply close popup without redirection
        this.hidePopup();
        
        // Reset OCR status if exists
        if (typeof ocrProcessor !== 'undefined') {
            ocrProcessor.reset();
        }
        
        // Reset camera-words status if exists
        if (typeof cameraWordsManager !== 'undefined') {
            cameraWordsManager.reset();
        }
    }

    async backgroundTranslateNewWords(newWords) {
        console.log('Background translation of new words:', newWords);
        
        try {
            let translatedCount = 0;
            
            for (let i = 0; i < newWords.length; i++) {
                const word = newWords[i];
                
                try {
                    // Get word from database to check if translation is needed
                    const wordFromDB = await databaseManager.getWordByText(word);
                    
                    if (wordFromDB && (!wordFromDB.translation || wordFromDB.translation === 'Translation unavailable')) {
                        const translation = await this.translateWord(word);
                        
                        // Update translation in database
                        await databaseManager.updateWord(wordFromDB.id, {
                            translation: translation
                        });
                        
                        console.log(`Background translation completed: ${word} -> ${translation}`);
                        translatedCount++;
                        
                        // Update dictionary display after each translation
                        if (typeof flashcardsManager !== 'undefined') {
                            flashcardsManager.refresh();
                        }
                    }
                    
                } catch (error) {
                    console.error('Background translation error for word:', word, error);
                }
                
                // Delay between requests
                if (i < newWords.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            // Вібрація при завершенні перекладу
            if (typeof hapticManager !== 'undefined' && translatedCount > 0) {
                hapticManager.translationComplete();
            }
            
        } catch (error) {
            console.error('Background translation error:', error);
        }
    }

    async translateWord(word) {
        console.log('Translating word through MyMemory API:', word);
        
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
                    !translation.includes('MYMEMORY WARNING') &&
                    !translation.includes('API LIMIT EXCEEDED') &&
                    !translation.includes('NO QUERY SPECIFIED')) {
                    
                    console.log(`API translation: ${word} -> ${translation}`);
                    return translation.trim();
                }
            }
            
            throw new Error('Poor quality translation');
            
        } catch (error) {
            console.error('Translation error:', word, error);
            return 'Translation error';
        }
    }

    // ======== UNIFIED MESSAGE DISPLAY FUNCTIONS ========

    showNotification(message, type = 'success') {
        // Create unified message with black background and white text
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Вібрація для повідомлення
        if (typeof hapticManager !== 'undefined') {
            hapticManager.notificationVibration(type);
        }
        
        // Remove after 3 seconds
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
        console.log('TextProcessor reset');
    }

    getSelectedWords() {
        return Array.from(this.selectedWords);
    }

    // ======== ДОДАТКОВІ МЕТОДИ ДЛЯ HAPTIC FEEDBACK ========

    // Метод для масового вибору слів (наприклад, "Select All")
    selectAllWords() {
        if (!this.popupChipsContainer) return;
        
        const chips = this.popupChipsContainer.querySelectorAll('.word-chip');
        let selectedCount = 0;
        
        chips.forEach(chip => {
            const word = chip.dataset.word;
            if (word && !this.selectedWords.has(word)) {
                this.selectedWords.add(word);
                chip.classList.add('selected');
                selectedCount++;
            }
        });
        
        if (selectedCount > 0) {
            // Прогресивна вібрація для масового вибору
            if (typeof hapticManager !== 'undefined') {
                hapticManager.sequentialVibration(selectedCount, this.allWords.length);
            }
        }
        
        this.updateSaveButton();
        console.log(`Selected all ${selectedCount} words`);
    }

    // Метод для скасування всіх виборів
    deselectAllWords() {
        const previousCount = this.selectedWords.size;
        this.clearSelection();
        
        if (previousCount > 0) {
            // М'яка вібрація при скасуванні всіх виборів
            if (typeof hapticManager !== 'undefined') {
                hapticManager.customVibration('light', 30);
            }
        }
        
        console.log(`Deselected all words (was ${previousCount})`);
    }

    // Швидкий вибір слів за довжиною
    selectWordsByLength(minLength = 3, maxLength = 15) {
        if (!this.popupChipsContainer) return;
        
        const chips = this.popupChipsContainer.querySelectorAll('.word-chip');
        let selectedCount = 0;
        
        chips.forEach(chip => {
            const word = chip.dataset.word;
            if (word && word.length >= minLength && word.length <= maxLength && !this.selectedWords.has(word)) {
                this.selectedWords.add(word);
                chip.classList.add('selected');
                selectedCount++;
            }
        });
        
        if (selectedCount > 0) {
            // Адаптивна вібрація залежно від кількості вибраних слів
            if (typeof hapticManager !== 'undefined') {
                hapticManager.adaptiveSuccess(selectedCount / this.allWords.length);
            }
        }
        
        this.updateSaveButton();
        console.log(`Selected ${selectedCount} words by length (${minLength}-${maxLength} chars)`);
    }
}

// Create global instance of text processor
console.log('Creating TextProcessor...');
const textProcessor = new TextProcessor();
console.log('TextProcessor created!');
