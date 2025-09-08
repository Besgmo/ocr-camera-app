console.log('=== camera-words.js LOADED ===');

// Camera Words Module - camera functionality for dictionary page
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
        console.log('CameraWordsManager initializing...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupCameraWords());
        } else {
            this.setupCameraWords();
        }
        
        console.log('CameraWordsManager ready!');
    }

    setupCameraWords() {
        // Get elements
        this.photoInput = document.getElementById('photo-input');
        this.canvas = document.getElementById('canvas');
        this.grabWordsBtn = document.getElementById('grab-words');
        this.statusEl = document.getElementById('ocr-status');

        if (!this.photoInput || !this.canvas || !this.grabWordsBtn) {
            console.error('Not all camera elements found');
            return;
        }

        // Set up event handlers
        this.setupEventListeners();
        
        console.log('Camera words configured');
    }

    setupEventListeners() {
        // Grab Words button
        this.grabWordsBtn.addEventListener('click', () => this.openPhotoSelector());
        
        // Photo selection
        this.photoInput.addEventListener('change', (e) => this.handlePhotoSelect(e));
        
        // Drag & Drop on entire page
        this.setupDragAndDrop();
        
        console.log('Camera words event listeners configured');
    }

    openPhotoSelector() {
        console.log('Opening photo selection...');
        
        this.updateStatus('Select photo or take a new one...', 'default');
        this.showStatus();
        
        // Open file picker
        this.photoInput.click();
    }

    async handlePhotoSelect(event) {
        const file = event.target.files[0];
        
        if (!file) {
            console.log('No file selected');
            this.hideStatus();
            return;
        }
        
        console.log('File selected:', file.name, 'Size:', file.size, 'bytes');
        
        if (!file.type.startsWith('image/')) {
            console.error('Selected file is not an image');
            this.updateStatus('Please select an image', 'error');
            setTimeout(() => this.hideStatus(), 3000);
            return;
        }
        
        try {
            await this.processPhoto(file);
        } catch (error) {
            console.error('Photo processing error:', error);
            this.updateStatus('Photo processing error', 'error');
            setTimeout(() => this.hideStatus(), 3000);
        } finally {
            // Clear input to allow selecting the same file again
            this.photoInput.value = '';
        }
    }

    async processPhoto(file) {
        if (this.isProcessing) {
            console.log('Processing already in progress...');
            return;
        }

        console.log('=== PHOTO PROCESSING ===');
        
        try {
            this.isProcessing = true;
            this.grabWordsBtn.disabled = true;
            this.grabWordsBtn.textContent = 'Processing...';
            
            this.updateStatus('Loading photo...', 'processing');
            
            // Create Image object for loading
            const img = new Image();
            
            // Process image after loading
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    try {
                        console.log('Photo loaded:', img.width, 'x', img.height);
                        
                        // Set canvas dimensions according to image
                        this.canvas.width = img.width;
                        this.canvas.height = img.height;
                        
                        const context = this.canvas.getContext('2d');
                        
                        // Draw image on canvas
                        context.drawImage(img, 0, 0);
                        
                        console.log('=== DETAILED INFORMATION ===');
                        console.log('Photo dimensions:', img.width, 'x', img.height);
                        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
                        console.log('Megapixels:', (img.width * img.height / 1000000).toFixed(2), 'MP');
                        console.log('File size:', (file.size / 1024).toFixed(2), 'KB');
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load photo'));
                };
                
                // Start image loading
                img.src = URL.createObjectURL(file);
            });
            
            // Start OCR processing
            if (typeof ocrProcessor !== 'undefined') {
                this.updateStatus('Recognizing text...', 'processing');
                await ocrProcessor.processImage(this.canvas);
            } else {
                console.error('OCR processor not available');
                throw new Error('OCR processor not found');
            }
            
            console.log('=== PHOTO PROCESSED ===');
            
        } catch (error) {
            console.error('Photo processing error:', error);
            this.updateStatus('Photo processing error', 'error');
            throw error;
        } finally {
            this.isProcessing = false;
            this.grabWordsBtn.disabled = false;
            this.grabWordsBtn.textContent = 'Grab words';
            
            // Hide status after some time if there was no error
            setTimeout(() => {
                if (this.statusEl && !this.statusEl.classList.contains('error')) {
                    this.hideStatus();
                }
            }, 2000);
        }
    }

    setupDragAndDrop() {
        const dropZone = document.body;
        
        // Prevent default browser behavior
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Add visual feedback during drag
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.highlightDropZone(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => this.unhighlightDropZone(), false);
        });
        
        // Handle dropped files
        dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        console.log('Drag & drop configured');
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlightDropZone() {
        document.body.style.backgroundColor = 'rgba(1, 245, 95, 0.1)';
        this.updateStatus('Release photo to process...', 'processing');
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
            console.log('File dropped:', file.name);
            
            if (file.type.startsWith('image/')) {
                this.handlePhotoSelect({ target: { files: [file] } });
            } else {
                console.error('Dropped file is not an image');
                this.updateStatus('Please drop an image', 'error');
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
            
            // Update classes
            this.statusEl.className = `ocr-status ${type}`;
            
            console.log(`OCR Status (${type}):`, message);
        }
        
        // Also update OCR processor if available
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

    // Public methods for use with other modules

    reset() {
        this.hideStatus();
        this.isProcessing = false;
        this.grabWordsBtn.disabled = false;
        this.grabWordsBtn.textContent = 'Grab words';
        console.log('CameraWordsManager reset');
    }

    isProcessingPhoto() {
        return this.isProcessing;
    }
}

// Create global instance
console.log('Creating CameraWordsManager...');
const cameraWordsManager = new CameraWordsManager();
console.log('CameraWordsManager created!');
