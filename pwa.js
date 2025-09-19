console.log('=== pwa.js LOADED ===');

// PWA Theme Manager для керування темними іконками
class PWAThemeManager {
    constructor() {
        this.currentTheme = this.detectTheme();
        this.themeChangeCallbacks = [];
        this.init();
    }

    init() {
        console.log('PWAThemeManager initializing...');
        this.setupThemeListener();
        this.updateMetaTags();
        this.updateManifest();
        console.log('PWAThemeManager ready!');
    }

    detectTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    setupThemeListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            const handleThemeChange = (e) => {
                const newTheme = e.matches ? 'dark' : 'light';
                if (newTheme !== this.currentTheme) {
                    this.currentTheme = newTheme;
                    console.log(`Theme changed to: ${this.currentTheme}`);
                    this.onThemeChange();
                }
            };
            
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handleThemeChange);
            } else if (mediaQuery.addListener) {
                mediaQuery.addListener(handleThemeChange);
            }
        }
    }

    onThemeChange() {
        this.updateMetaTags();
        this.updateManifest();
        this.notifyServiceWorker();
        
        // Викликаємо всі зареєстровані callbacks
        this.themeChangeCallbacks.forEach(callback => {
            try {
                callback(this.currentTheme);
            } catch (error) {
                console.error('Theme change callback error:', error);
            }
        });
    }

    updateMetaTags() {
        // Оновлюємо theme-color
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (themeColorMeta) {
            themeColorMeta.content = this.currentTheme === 'dark' ? '#1a1a1a' : '#01F55F';
        }

        // Оновлюємо статус бар для iOS
        let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (statusBarMeta) {
            statusBarMeta.content = this.currentTheme === 'dark' ? 'black-translucent' : 'default';
        }
    }

    async updateManifest() {
        try {
            const response = await fetch('/ocr-camera-app/manifest.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch manifest: ${response.status}`);
            }
            
            const manifest = await response.json();
            
            // Фільтруємо іконки для поточної теми
            const filteredIcons = manifest.icons.filter(icon => {
                if (!icon.media) return true;
                const isDarkIcon = icon.media.includes('prefers-color-scheme: dark');
                return (isDarkIcon && this.currentTheme === 'dark') || 
                       (!isDarkIcon && this.currentTheme === 'light');
            });

            // Фільтруємо shortcuts іконки
            if (manifest.shortcuts) {
                manifest.shortcuts.forEach(shortcut => {
                    if (shortcut.icons) {
                        shortcut.icons = shortcut.icons.filter(icon => {
                            if (!icon.media) return true;
                            const isDarkIcon = icon.media.includes('prefers-color-scheme: dark');
                            return (isDarkIcon && this.currentTheme === 'dark') || 
                                   (!isDarkIcon && this.currentTheme === 'light');
                        });
                    }
                });
            }

            manifest.icons = filteredIcons;
            manifest.theme_color = this.currentTheme === 'dark' ? '#1a1a1a' : '#01F55F';
            manifest.background_color = this.currentTheme === 'dark' ? '#000000' : '#FFFFFF';

            const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
            const manifestURL = URL.createObjectURL(blob);

            let manifestLink = document.querySelector('link[rel="manifest"]');
            if (manifestLink) {
                const oldURL = manifestLink.href;
                manifestLink.href = manifestURL;
                
                // Очищуємо старий URL для економії пам'яті
                if (oldURL.startsWith('blob:')) {
                    URL.revokeObjectURL(oldURL);
                }
            }

            console.log('Manifest updated for theme:', this.currentTheme);
        } catch (error) {
            console.error('Failed to update manifest:', error);
        }
    }

    async notifyServiceWorker() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
                navigator.serviceWorker.controller.postMessage({
                    type: 'THEME_CHANGED',
                    theme: this.currentTheme
                });
            } catch (error) {
                console.error('Failed to notify service worker:', error);
            }
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    addThemeChangeListener(callback) {
        if (typeof callback === 'function') {
            this.themeChangeCallbacks.push(callback);
        }
    }

    removeThemeChangeListener(callback) {
        const index = this.themeChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.themeChangeCallbacks.splice(index, 1);
        }
    }
}

// PWA Manager - управління Progressive Web App функціональністю
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.installPrompt = null;
        this.installBtn = null;
        this.dismissBtn = null;
        this.isInstalled = false;
        this.themeManager = new PWAThemeManager();
        
        this.init();
    }

    init() {
        console.log('PWAManager initializing...');
        
        this.checkPWAMode();
        this.registerServiceWorker();
        this.setupInstallPrompt();
        this.handleShortcuts();
        
        console.log('PWAManager ready!');
    }

    checkPWAMode() {
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('Running as PWA');
            document.body.classList.add('pwa-mode');
            this.isInstalled = true;
        } else {
            console.log('Running in browser');
            document.body.classList.add('browser-mode');
            this.isInstalled = false;
        }
    }

    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.log('Service Worker не підтримується');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/ocr-camera-app/sw.js');
            console.log('SW registered:', registration);
            
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('SW update found');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('New SW version available!');
                        this.showUpdateNotification();
                    }
                });
            });

            navigator.serviceWorker.addEventListener('message', event => {
                this.handleServiceWorkerMessage(event);
            });

        } catch (error) {
            console.error('SW registration failed:', error);
        }
    }

    setupInstallPrompt() {
        this.installPrompt = document.getElementById('pwa-install-prompt');
        this.installBtn = document.getElementById('pwa-install-btn');
        this.dismissBtn = document.getElementById('pwa-dismiss-btn');

        if (!this.installPrompt || !this.installBtn || !this.dismissBtn) {
            console.warn('Install prompt elements not found, creating them...');
            this.createInstallPrompt();
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            
            if (!this.isInstalled) {
                this.showInstallPrompt();
            }
        });

        if (this.installBtn && this.dismissBtn) {
            this.installBtn.addEventListener('click', () => this.handleInstallClick());
            this.dismissBtn.addEventListener('click', () => this.hideInstallPrompt());
        }

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallPrompt();
            this.isInstalled = true;
            this.showNotification('App installed successfully!', 'success');
        });
    }

    createInstallPrompt() {
        if (!document.getElementById('pwa-install-prompt')) {
            const promptHTML = `
                <div id="pwa-install-prompt" class="pwa-install-prompt">
                    <div>Install Words graber for better experience</div>
                    <button id="pwa-install-btn" class="btn btn-primary">Install</button>
                    <button id="pwa-dismiss-btn" class="btn btn-secondary">Later</button>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', promptHTML);
            
            this.installPrompt = document.getElementById('pwa-install-prompt');
            this.installBtn = document.getElementById('pwa-install-btn');
            this.dismissBtn = document.getElementById('pwa-dismiss-btn');
        }
    }

    showInstallPrompt() {
        if (this.installPrompt) {
            this.installPrompt.classList.add('show');
        }
    }

    hideInstallPrompt() {
        if (this.installPrompt) {
            this.installPrompt.classList.remove('show');
        }
    }

    async handleInstallClick() {
        if (!this.deferredPrompt) {
            console.log('No deferred prompt available');
            return;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            
            console.log(`User response to install prompt: ${outcome}`);
            
            if (outcome === 'accepted') {
                this.showNotification('Installing app...', 'info');
            }
            
            this.deferredPrompt = null;
            this.hideInstallPrompt();
        } catch (error) {
            console.error('Install prompt error:', error);
        }
    }

    handleShortcuts() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action === 'camera') {
            console.log('Camera shortcut detected');
            window.addEventListener('load', () => {
                setTimeout(() => {
                    if (typeof cameraWordsManager !== 'undefined') {
                        cameraWordsManager.openPhotoSelector();
                    }
                }, 1000);
            });
        }
    }

    showUpdateNotification() {
        const updateNotification = document.createElement('div');
        updateNotification.className = 'notification update';
        updateNotification.innerHTML = `
            <div>New version available!</div>
            <button class="btn btn-primary" onclick="location.reload()">Update</button>
            <button class="btn btn-secondary" onclick="this.parentElement.remove()">Later</button>
        `;
        
        document.body.appendChild(updateNotification);
        
        setTimeout(() => {
            if (updateNotification.parentNode) {
                updateNotification.remove();
            }
        }, 10000);
    }

    handleServiceWorkerMessage(event) {
        const { data } = event;
        
        if (data.type === 'VERSION_INFO') {
            console.log('SW Version:', data.version);
        }
        
        if (data.type === 'CACHE_UPDATED') {
            console.log('Cache updated:', data.urls);
        }
        
        if (data.type === 'OFFLINE_FALLBACK') {
            this.showNotification('You are offline. Some features may be limited.', 'warning');
        }

        if (data.type === 'THEME_UPDATED') {
            console.log('Theme update acknowledged by SW:', data.theme);
        }

        if (data.type === 'SYNC_COMPLETED') {
            if (data.success) {
                this.showNotification('Data synchronized successfully', 'success');
            } else {
                this.showNotification('Synchronization failed', 'error');
            }
        }
    }

    async sendMessageToSW(message) {
        if (!navigator.serviceWorker.controller) {
            console.warn('No active service worker');
            return null;
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };
            
            navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
        });
    }

    async checkForUpdates() {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.update();
                console.log('Checked for SW updates');
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    async getVersion() {
        try {
            const version = await this.sendMessageToSW({ type: 'GET_VERSION' });
            return version;
        } catch (error) {
            console.error('Failed to get version:', error);
            return null;
        }
    }

    async addToCache(urls) {
        try {
            await this.sendMessageToSW({ 
                type: 'ADD_TO_CACHE', 
                urls: Array.isArray(urls) ? urls : [urls]
            });
            console.log('Added to cache:', urls);
        } catch (error) {
            console.error('Failed to add to cache:', error);
        }
    }

    checkOnlineStatus() {
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                document.body.classList.remove('offline');
                console.log('Online');
            } else {
                document.body.classList.add('offline');
                this.showNotification('You are offline', 'warning');
                console.log('Offline');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        updateOnlineStatus();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
        
        console.log(`PWA Notification (${type}):`, message);
    }

    async scheduleBackgroundSync(tag = 'background-sync-words') {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register(tag);
                console.log('Background sync scheduled:', tag);
            } catch (error) {
                console.error('Background sync registration failed:', error);
            }
        } else {
            console.log('Background sync not supported');
        }
    }

    checkFeatureSupport() {
        const features = {
            serviceWorker: 'serviceWorker' in navigator,
            manifest: 'manifest' in document.createElement('link'),
            installPrompt: 'BeforeInstallPromptEvent' in window,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
            webShare: 'share' in navigator,
            darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
            standalone: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        };

        console.log('PWA Feature Support:', features);
        return features;
    }

    onDOMReady() {
        this.checkOnlineStatus();
        this.checkFeatureSupport();
        
        console.log('PWA DOM ready initialization completed');
    }

    // Методи для роботи з темою
    getCurrentTheme() {
        return this.themeManager.getCurrentTheme();
    }

    onThemeChanged(callback) {
        this.themeManager.addThemeChangeListener(callback);
    }

    offThemeChanged(callback) {
        this.themeManager.removeThemeChangeListener(callback);
    }

    // Метод для перевірки чи PWA встановлено
    isPWAInstalled() {
        return this.isInstalled;
    }

    // Метод для програмного показу install prompt
    showInstall() {
        if (this.deferredPrompt) {
            this.showInstallPrompt();
        } else {
            console.log('Install prompt not available');
        }
    }

    // Метод для отримання інформації про PWA
    getPWAInfo() {
        return {
            isInstalled: this.isInstalled,
            currentTheme: this.getCurrentTheme(),
            features: this.checkFeatureSupport(),
            hasInstallPrompt: !!this.deferredPrompt
        };
    }
}

// Створюємо глобальний екземпляр
console.log('Creating PWAManager...');
const pwaManager = new PWAManager();

// Робимо PWAManager доступним глобально
window.pwaManager = pwaManager;

// Ініціалізуємо після завантаження DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pwaManager.onDOMReady());
} else {
    pwaManager.onDOMReady();
}

console.log('PWAManager created and available as window.pwaManager!');
