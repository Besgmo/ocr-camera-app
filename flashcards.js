console.log('=== flashcards.js LOADED ===');

// Dictionary Module - simplified without HTML markup
class DictionaryManager {
    constructor() {
        this.translationInProgress = false;
        this.init();
    }

    init() {
        console.log('DictionaryManager initializing...');
        
        // Wait for DOM to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDictionary());
        } else {
            this.setupDictionary();
        }
        
        console.log('DictionaryManager ready!');
    }

    setupDictionary() {
        // Set up event handlers
        this.setupEventListeners();
        
        // Launch initial processes
        this.updateWordsCount();
        this.autoTranslateAllWords();
        
        console.log('Dictionary configured');
    }

    setupEventListeners() {
        // Handler for settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                console.log('Settings clicked');
                this.showSettingsMenu();
            });
        }
    }

    showSettingsMenu() {
        // Create settings menu
        this.createSettingsMenu();
    }

    createSettingsMenu() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'settings-menu';

        // Title
        const title = document.createElement('h3');
        title.textContent = 'Settings';
        title.style.cssText = `
            margin: 0 0 var(--space-lg) 0;
            font-size: var(--font-24);
            font-weight: var(--font-semibold);
            color: var(--black);
            text-align: center;
        `;

        // "Export dictionary" button
        const exportBtn = document.createElement('button');
        exportBtn.className = 'settings-option';
        exportBtn.textContent = 'Export dictionary';

        // "Import dictionary" button
        const importBtn = document.createElement('button');
        importBtn.className = 'settings-option';
        importBtn.textContent = 'Import dictionary';

        // "OCR Settings" button
        const ocrBtn = document.createElement('button');
        ocrBtn.className = 'settings-option';
        ocrBtn.innerHTML = 'Token Settings <span style="float: right; color: var(--dark);">→</span>';

        // "Delete all words" button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'settings-option danger';
        clearBtn.textContent = 'Delete all words';

        // "Cancel" button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'settings-option';
        cancelBtn.textContent = 'Cancel';

        // Event handlers
        exportBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
            this.exportDictionary();
        });

        importBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
            this.importDictionary();
        });

        ocrBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
            // Open token settings
            if (typeof tokenManager !== 'undefined') {
                tokenManager.showTokenSettings();
            } else {
                console.error('TokenManager not available');
                this.showErrorMessage('Error: token manager unavailable');
            }
        });

        clearBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
            this.clearAllWords();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeSettingsMenu(overlay);
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeSettingsMenu(overlay);
            }
        });

        // Assemble menu
        menu.appendChild(title);
        menu.appendChild(exportBtn);
        menu.appendChild(importBtn);
        menu.appendChild(ocrBtn);
        menu.appendChild(clearBtn);
        menu.appendChild(cancelBtn);
        overlay.appendChild(menu);

        // Add to DOM
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

    showDeleteMessage(message, type = 'success') {
        // Use the same unified function
        this.showNotification(message, type);
    }

    // ======== TRANSLATION FUNCTIONS ========

    async autoTranslateAllWords() {
        if (this.translationInProgress) {
            console.log('Translation already in progress...');
            return;
        }

        try {
            this.translationInProgress = true;
            console.log('Automatic translation check...');
            
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
                    const word = wordsToTranslate[i];
                    
                    this.updateTranslationStatus(`Background translation: ${word.word} (${i + 1}/${wordsToTranslate.length})`);
                    
                    try {
                        const translation = await this.translateWord(word.word);
                        
                        await databaseManager.updateWord(word.id, {
                            translation: translation
                        });
                        
                        console.log(`Background translation: ${word.word} -> ${translation}`);
                        
                        // Update dictionary display after each translation
                        this.updateWordsCount();
                        this.showAllWords();
                        
                    } catch (error) {
                        console.error('Background translation error:', word.word, error);
                        await databaseManager.updateWord(word.id, {
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
                    
                    console.log(`MyMemory API success: ${word} -> ${translation}`);
                    return translation.trim();
                } else {
                    console.log('Poor quality translation:', translation);
                    throw new Error('Poor quality translation from API');
                }
            } else {
                console.log('API returned error:', data);
                throw new Error(`API Error: ${data.responseStatus || 'Unknown'}`);
            }
            
        } catch (error) {
            console.error('MyMemory API error for word', word, ':', error.message);
            throw new Error(`Failed to translate word "${word}": ${error.message}`);
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
            console.error('Error updating word count:', error);
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
                            <p>Dictionary is empty</p>
                            <p>Add words through camera and OCR</p>
                        </div>
                    `;
                } else {
                    wordsListEl.innerHTML = sortedWords.map(word => {
                        const translation = word.translation || 'Translation unavailable';
                        const isTranslating = translation === 'Translation unavailable' || 
                                            translation === 'Translation error' ||
                                            translation.startsWith('[translation:');
                        
                        return `
                            <div class="word-item ${isTranslating ? 'translating' : ''}" data-word-id="${word.id}">
                                <div class="word-content">
                                    <div class="word">${word.word}</div>
                                    <div class="translation">${translation}</div>
                                </div>
                                <button class="word-delete-btn" data-word-id="${word.id}" title="Delete word">
                                    <img src="icons/Trash Bin Trash.svg" alt="Delete" width="20" height="20">
                                </button>
                            </div>
                        `;
                    }).join('');
                    
                    // Add handlers for delete buttons
                    this.setupDeleteButtons();
                }
            }
        } catch (error) {
            console.error('Error showing words:', error);
        }
    }

    setupDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.word-delete-btn');
        
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                const wordId = parseInt(button.dataset.wordId);
                const wordElement = button.closest('.word-item');
                const wordText = wordElement.querySelector('.word').textContent;
                
                this.handleDeleteWord(wordId, wordText);
            });
        });
    }

    async handleDeleteWord(wordId, wordText) {
        // Deletion confirmation
        const confirmed = confirm(`Are you sure you want to delete the word "${wordText}"?`);
        
        if (!confirmed) {
            return;
        }

        try {
            console.log(`Deleting word: ${wordText} (ID: ${wordId})`);
            
            // Check if word exists before deletion
            const existingWord = await databaseManager.getAllWords();
            const wordExists = existingWord.find(w => w.id === wordId);
            
            if (!wordExists) {
                console.error('Word not found in database');
                this.showErrorMessage(`Word "${wordText}" not found`);
                return;
            }
            
            // Delete from database
            await databaseManager.deleteWord(wordId);
            
            // Check if actually deleted
            const remainingWords = await databaseManager.getAllWords();
            const stillExists = remainingWords.find(w => w.id === wordId);
            
            if (stillExists) {
                console.error('Word was not deleted from database');
                this.showErrorMessage(`Error deleting word "${wordText}"`);
                return;
            }
            
            // Show success message
            this.showSuccessMessage(`Word "${wordText}" deleted`);
            
            // Update display
            this.refresh();
            
            console.log(`Word "${wordText}" successfully deleted permanently`);
            
        } catch (error) {
            console.error('Error deleting word:', error);
            this.showErrorMessage(`Error deleting word "${wordText}"`);
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

    // ======== DICTIONARY IMPORT ========

    // Method for importing dictionary
    async importDictionary() {
        try {
            // Create hidden file input
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';

            // Add to DOM
            document.body.appendChild(fileInput);

            // File selection handler
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.handleImportFile(file);
                }
                // Remove input after use
                document.body.removeChild(fileInput);
            });

            // Open file picker
            fileInput.click();

        } catch (error) {
            console.error('Dictionary import error:', error);
            this.showErrorMessage('Dictionary import error');
        }
    }

    async handleImportFile(file) {
        try {
            console.log('Processing import file:', file.name);

            // Check file type
            if (!file.name.toLowerCase().endsWith('.json')) {
                this.showErrorMessage('Please select a JSON file');
                return;
            }

            // Read file
            const fileContent = await this.readFileAsText(file);
            
            // Parse JSON
            let importData;
            try {
                importData = JSON.parse(fileContent);
            } catch (error) {
                this.showErrorMessage('Invalid JSON file format');
                return;
            }

            // Validate data
            if (!this.validateImportData(importData)) {
                this.showErrorMessage('Invalid dictionary file structure');
                return;
            }

            // Process imported words
            const results = await this.processImportedWords(importData);
            
            // Show result
            const addedWords = results.filter(r => r.status === 'added').length;
            const existingWords = results.filter(r => r.status === 'exists').length;
            
            let message = '';
            if (addedWords > 0) {
                message = `Imported ${addedWords} new words`;
                if (existingWords > 0) {
                    message += `, ${existingWords} already existed`;
                }
            } else if (existingWords > 0) {
                message = 'All words were already in dictionary';
            } else {
                message = 'No words found to import';
            }

            this.showSuccessMessage(message);
            console.log('Import completed:', { added: addedWords, existing: existingWords });

        } catch (error) {
            console.error('Import processing error:', error);
            this.showErrorMessage('File processing error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('File reading error'));
            reader.readAsText(file, 'utf-8');
        });
    }

    validateImportData(data) {
        // Check if it's an array
        if (!Array.isArray(data)) {
            console.error('Data is not an array');
            return false;
        }

        // Check if array is not empty
        if (data.length === 0) {
            console.error('Array is empty');
            return false;
        }

        // Check structure of each element
        for (const item of data) {
            if (!this.validateWord(item)) {
                return false;
            }
        }

        return true;
    }

    validateWord(wordObj) {
        // Check if it's an object
        if (typeof wordObj !== 'object' || wordObj === null) {
            console.error('Element is not an object:', wordObj);
            return false;
        }

        // Check for word field presence
        if (!wordObj.word || typeof wordObj.word !== 'string' || wordObj.word.trim() === '') {
            console.error('Missing or invalid word field:', wordObj);
            return false;
        }

        return true;
    }

    async processImportedWords(importData) {
        try {
            // Extract only word text for adding
            const wordsToAdd = importData
                .filter(item => this.validateWord(item))
                .map(item => item.word.trim())
                .filter(word => word.length > 0);

            console.log('Words to import:', wordsToAdd);

            // Use existing word addition method
            const results = await databaseManager.addWords(wordsToAdd);

            // Update display
            this.refresh();

            // Launch background translation for new words
            const addedWords = results.filter(r => r.status === 'added');
            if (addedWords.length > 0) {
                setTimeout(() => this.autoTranslateAllWords(), 1000);
            }

            return results;

        } catch (error) {
            console.error('Error processing imported words:', error);
            throw error;
        }
    }

    // ======== PUBLIC METHODS ========

    // Method for updating dictionary from outside
    refresh() {
        console.log('Updating dictionary...');
        this.updateWordsCount();
    }

    // Method for adding words
    async addWords(words) {
        if (!words || words.length === 0) {
            console.log('No words to add');
            return [];
        }

        try {
            const results = await databaseManager.addWords(words);
            
            // Count results
            const added = results.filter(r => r.status === 'added').length;
            const existing = results.filter(r => r.status === 'exists').length;
            
            console.log(`Added ${added} new words, ${existing} already existed`);
            
            // Update display
            this.refresh();
            
            // Launch background translation for new words
            if (added > 0) {
                setTimeout(() => this.autoTranslateAllWords(), 1000);
            }
            
            return results;
            
        } catch (error) {
            console.error('Error adding words:', error);
            throw error;
        }
    }

    // Method for deleting a word
    async deleteWord(id) {
        try {
            await databaseManager.deleteWord(id);
            console.log('Word deleted, ID:', id);
            this.refresh();
            return true;
        } catch (error) {
            console.error('Error deleting word:', error);
            throw error;
        }
    }

    // Method for clearing entire dictionary
    async clearAllWords() {
        if (!confirm('Are you sure you want to delete all words from the dictionary?')) {
            return false;
        }

        try {
            await databaseManager.clearAllWords();
            console.log('All words deleted');
            this.showSuccessMessage('All words deleted from dictionary');
            this.refresh();
            return true;
        } catch (error) {
            console.error('Error clearing dictionary:', error);
            this.showErrorMessage('Error clearing dictionary');
            throw error;
        }
    }

    // Method for searching words
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
            console.error('Error searching words:', error);
            return [];
        }
    }

    // Method for getting statistics
    async getStats() {
        try {
            return await databaseManager.getStats();
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                total: 0,
                new: 0,
                withTranslation: 0
            };
        }
    }

    // Method for forced translation of specific word
    async retranslateWord(wordId) {
        try {
            const word = await databaseManager.getWordById(wordId);
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
            this.refresh();
            
            return translation;
            
        } catch (error) {
            console.error('Error translating word:', error);
            this.hideTranslationStatus();
            throw error;
        }
    }

    // Method for exporting dictionary
    async exportDictionary() {
        try {
            const allWords = await databaseManager.getAllWords();
            
            if (allWords.length === 0) {
                this.showErrorMessage('Dictionary is empty');
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
            
            this.showSuccessMessage(`Dictionary exported (${allWords.length} words)`);
            console.log('Dictionary exported');
            return true;
            
        } catch (error) {
            console.error('Error exporting dictionary:', error);
            this.showErrorMessage('Error exporting dictionary');
            throw error;
        }
    }

    // Method for checking translation state
    isTranslating() {
        return this.translationInProgress;
    }
}

// Create global instance
console.log('Creating DictionaryManager...');
const flashcardsManager = new DictionaryManager();
console.log('DictionaryManager created!');
