console.log('=== pwa.js LOADED ===');

// PWA Manager - управління Progressive Web App функціональністю
class PWAManager {
    constructor() {
        this.deferredPrompt = null;
        this.installPrompt = null;
        this.installBtn = null;
        this.dismissBtn = null;
        this.isInstalled = false;
        
        this.init();
    }

    init() {
        console.log('PWAManager initializing...');
        
        // Перевіряємо чи запущено як PWA
        this.checkPWAMode();
        
        // Реєструємо Service Worker
        this.registerServiceWorker();
        
        // Налаштовуємо install prompt
        this.setupInstallPrompt();
        
        // Обробляємо URL параметри (shortcuts)
        this.handleShortcuts();
        
        console.log('PWAManager ready!');
    }

    checkPWAMode() {
        // Перевіряємо чи додаток запущено як PWA
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
            
            // Перевіряємо оновлення
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

            // Слухаємо повідомлення від SW
            navigator.serviceWorker.addEventListener('message', event => {
                this.handleServiceWorkerMessage(event);
            });

        } catch (error) {
            console.error('SW registration failed:', error);
        }
    }

    setupInstallPrompt() {
        // Отримуємо елементи
        this.installPrompt = document.getElementById('pwa-install-prompt');
        this.installBtn = document.getElementById('pwa-install-btn');
        this.dismissBtn = document.getElementById('pwa-dismiss-btn');

        if (!this.installPrompt || !this.installBtn || !this.dismissBtn) {
            console.warn('Install prompt elements not found');
            return;
        }

        // Слухаємо beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA install prompt available');
            e.preventDefault();
            this.deferredPrompt = e;
            
            // Показуємо prompt якщо не встановлено
            if (!this.isInstalled) {
                this.showInstallPrompt();
            }
        });

        // Обробники кнопок
        this.installBtn.addEventListener('click', () => this.handleInstallClick());
        this.dismissBtn.addEventListener('click', () => this.hideInstallPrompt());

        // Слухаємо подію встановлення
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallPrompt();
            this.isInstalled = true;
            this.showNotification('App installed successfully!', 'success');
        });
    }



    handleShortcuts() {
        // Обробляємо URL параметри для shortcuts
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action === 'camera') {
            console.log('Camera shortcut detected');
            // Відкриваємо камеру після завантаження додатку
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
        // Створюємо повідомлення про оновлення
        const updateNotification = document.createElement('div');
        updateNotification.className = 'notification update';
        updateNotification.innerHTML = `
            <div>New version available!</div>
            <button class="btn btn-primary" onclick="location.reload()">Update</button>
            <button class="btn btn-secondary" onclick="this.parentElement.remove()">Later</button>
        `;
        
        document.body.appendChild(updateNotification);
        
        // Автоматично видаляємо через 10 секунд
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
    }

    // Метод для відправки повідомлень до SW
    async sendMessageToSW(message) {
        if (!navigator.serviceWorker.controller) {
            console.warn('No active service worker');
            return;
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data);
            };
            
            navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
        });
    }

    // Публічні методи

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

    // Метод для додавання до кешу нових ресурсів
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

    // Перевірка online/offline статусу
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
        
        // Перевіряємо статус при ініціалізації
        updateOnlineStatus();
    }

    // Уніфіковані повідомлення
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

    // Методи для роботи з background sync
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

    // Перевірка підтримки PWA функцій
    checkFeatureSupport() {
        const features = {
            serviceWorker: 'serviceWorker' in navigator,
            manifest: 'manifest' in document.createElement('link'),
            installPrompt: 'BeforeInstallPromptEvent' in window,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
            webShare: 'share' in navigator
        };

        console.log('PWA Feature Support:', features);
        return features;
    }

    // Ініціалізація після завантаження DOM
    onDOMReady() {
        // Перевіряємо online/offline
        this.checkOnlineStatus();
        
        // Перевіряємо підтримку функцій
        this.checkFeatureSupport();
        
        console.log('PWA DOM ready initialization completed');
    }
}

// Створюємо глобальний екземпляр
console.log('Creating PWAManager...');
const pwaManager = new PWAManager();

// Ініціалізуємо після завантаження DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => pwaManager.onDOMReady());
} else {
    pwaManager.onDOMReady();
}

console.log('PWAManager created!');
