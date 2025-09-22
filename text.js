console.log('=== text.js LOADED ===');

// Text Processing Module - text conversion to word chips with popup and translation management
class TextProcessor {
    constructor() {
        this.selectedWords = new Set();
        this.allWords = [];
        this.popupEl = null;
        this.popupChipsContainer = null;
        this.popupSaveBtn = null;
        this.popupBackBtn = null;
        this.translationInProgress = false;
        
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
        } else {
            // Add to selected
            this.selectedWords.add(word);
            chipElement.classList.add('selected');
            console.log('Added to selected:', word);
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
            
            // Use unified message display function
            this.showNotification(message || 'Words processed', 'success');
            
            // Close popup and stay on page
            this.closePopup();
            
            // Update dictionary display
            if (typeof flashcardsManager !== 'undefined') {
                flashcardsManager.refresh();
            }
            
            // Start translation for all words that need it (including new ones)
            if (added > 0) {
                setTimeout(() => this.translateAllWords(), 1000);
            }
            
        } catch (error) {
            console.error('Error adding words:', error);
            this.showNotification('Error while saving words', 'error');
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

    // ======== TRANSLATION FUNCTIONS ========

    async ensureApiKey() {
        // Use tokenManager for API key management
        if (typeof tokenManager === 'undefined') {
            throw new Error("Token Manager unavailable");
        }

        if (!tokenManager.isApiKeyAvailable()) {
            this.updateTranslationStatus('API key required. Open token settings.');
            
            // Auto-open token settings
            setTimeout(() => {
                if (typeof tokenManager !== 'undefined') {
                    tokenManager.showTokenSettings();
                }
            }, 1000);
            
            throw new Error("API key not set");
        }

        return tokenManager.getApiKey();
    }

    async translateWord(word) {
        console.log('Translating word through GPT-3.5-turbo:', word);
        
        try {
            // Handle words that should remain unchanged
            const untranslateableWords = ['the', 'a', 'an', 'IT', 'USB', 'WiFi', 'GPS', 'HTML', 'CSS', 'JS', 'API', 'URL', 'PDF'];
            if (untranslateableWords.includes(word.toUpperCase()) || untranslateableWords.includes(word.toLowerCase())) {
                console.log(`Keeping word unchanged: ${word}`);
                return word;
            }

            const apiKey = await this.ensureApiKey();
            
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "user",
                            content: `Translate the English word "${word}" to Ukrainian. Important rules:
- If it's an article (a, an, the), keep it unchanged
- If it's a technical term, abbreviation, or proper noun that doesn't have a direct Ukrainian equivalent, keep it unchanged
- Otherwise provide only the Ukrainian translation
- Respond with just the result, no explanations`
                        }
                    ],
                    max_tokens: 100,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error("Translation API Error:", errorData);

                if (response.status === 401) {
                    this.updateTranslationStatus('Invalid API key. Update key in settings.');
                    setTimeout(() => {
                        if (typeof tokenManager !== 'undefined') {
                            tokenManager.showTokenSettings();
                        }
                    }, 2000);
                    throw new Error("Invalid or expired API key");
                }

                const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
                throw new Error(`Translation API error: ${errorMessage}`);
            }

            const data = await response.json();
            const translation = data.choices?.[0]?.message?.content?.trim() || "";
            
            if (!translation) {
                throw new Error("Empty translation response");
            }

            // Basic validation - check for obvious errors
            if (translation.includes('MYMEMORY') || 
                translation.includes('API LIMIT') || 
                translation.includes('ERROR') ||
                translation.toLowerCase().includes('sorry') ||
                translation.toLowerCase().includes('cannot') ||
                !translation.trim()) {
                console.log('Invalid translation response:', translation);
                throw new Error('Poor quality translation from API');
            }

            // Check for completely nonsensical translations
            if (translation.length > word.length * 5) {
                console.log('Translation too long, likely explanation rather than translation:', translation);
                throw new Error('Poor quality translation from API');
            }

            console.log(`GPT-3.5-turbo translation: ${word} -> ${translation}`);
            return translation;
            
        } catch (error) {
            console.error('Translation error for word', word, ':', error.message);
            throw new Error(`Failed to translate word "${word}": ${error.message}`);
        }
    }

    // Main method for translating all untranslated words
    async translateAllWords() {
        if (this.translationInProgress) {
            console.log('Translation already in progress...');
            return;
        }

        try {
            this.translationInProgress = true;
            console.log('Starting translation for all untranslated words...');
            
            const allWords = await databaseManager.getAllWords();
            const wordsToTranslate = allWords.filter(word => 
                !word.translation || 
                !word.translation.trim() || 
                word.translation.startsWith('[translation:') ||
                word.translation === 'Translation error' ||
                word.translation === 'Translation unavailable'
            );
            
            console.log(`Found ${wordsToTranslate.length} words without translation`);
            
            if (wordsToTranslate.length > 0) {
                this.updateTranslationStatus(`Background translation: ${wordsToTranslate.length} words...`);
                
                for (let i = 0; i < wordsToTranslate.length; i++) {
                    const wordRecord = wordsToTranslate[i];
                    
                    this.updateTranslationStatus(`Background translation: ${wordRecord.word} (${i + 1}/${wordsToTranslate.length})`);
                    
                    try {
                        const translation = await this.translateWord(wordRecord.word);
                        
                        await databaseManager.updateWord(wordRecord.id, {
                            translation: translation
                        });
                        
                        console.log(`Background translation: ${wordRecord.word} -> ${translation}`);
                        
                        // Update dictionary display after each translation
                        if (typeof flashcardsManager !== 'undefined') {
                            flashcardsManager.refresh();
                        }
                        
                    } catch (error) {
                        console.error('Background translation error:', wordRecord.word, error);
                        await databaseManager.updateWord(wordRecord.id, {
                            translation: 'Translation error'
                        });
                    }
                    
                    // Delay between requests
                    if (i < wordsToTranslate.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 400));
                    }
                }
                
                this.updateTranslationStatus('Background translation completed!');
                setTimeout(() => this.hideTranslationStatus(), 2000);
            }
            
        } catch (error) {
            console.error('Auto translation error:', error);
            this.hideTranslationStatus();
        } finally {
            this.translationInProgress = false;
        }
    }

    // Method for forced translation of specific word
    async retranslateWord(wordId) {
        try {
            // Get word from database
            const allWords = await databaseManager.getAllWords();
            const word = allWords.find(w => w.id === wordId);
            
            if (!word) {
                throw new Error('Word not found');
            }

            this.updateTranslationStatus(`Translating: ${word.word}...`);
            
            const translation = await this.translateWord(word.word);
            
            await databaseManager.updateWord(wordId, {
                translation: translation
            });
            
            console.log(`Translation updated: ${word.word} -> ${translation}`);
            
            this.hideTranslationStatus();
            
            // Update dictionary display
            if (typeof flashcardsManager !== 'undefined') {
                flashcardsManager.refresh();
            }
            
            return translation;
            
        } catch (error) {
            console.error('Error translating word:', error);
            this.hideTranslationStatus();
            throw error;
        }
    }

    updateTranslationStatus(message) {
        // Try to update status in flashcards manager
        if (typeof flashcardsManager !== 'undefined' && flashcardsManager.updateTranslationStatus) {
            flashcardsManager.updateTranslationStatus(message);
        } else {
            console.log('Translation status:', message);
        }
    }

    hideTranslationStatus() {
        // Try to hide status in flashcards manager
        if (typeof flashcardsManager !== 'undefined' && flashcardsManager.hideTranslationStatus) {
            flashcardsManager.hideTranslationStatus();
        }
    }

    // Check if translation is in progress
    isTranslating() {
        return this.translationInProgress;
    }

    // ======== UNIFIED MESSAGE DISPLAY FUNCTIONS ========

    showNotification(message, type = 'success') {
        // Create unified message with black background and white text
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
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
}

// Create global instance of text processor
console.log('Creating TextProcessor...');
const textProcessor = new TextProcessor();
console.log('TextProcessor created!');
