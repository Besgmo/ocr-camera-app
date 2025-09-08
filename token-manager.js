console.log('=== token-manager.js ЗАВАНТАЖЕНО ===');

// Token Manager Module - управління API ключами OCR
class TokenManager {
    constructor() {
        this.apiKeyStorageKey = 'gpt4omini_api_key';
        this.init();
    }

    init() {
        console.log('TokenManager ініціалізується...');
        console.log('TokenManager готовий!');
    }

    // Головний метод для показу налаштувань токенів
    showTokenSettings() {
        console.log('Показуємо налаштування токенів...');
        this.createTokenSettingsMenu();
    }

    createTokenSettingsMenu() {
        // Створюємо overlay
        const overlay = document.createElement('div');
        overlay.className = 'settings-overlay';

        // Створюємо меню
        const menu = document.createElement('div');
        menu.className = 'settings-menu';

        // Кнопка назад з стрілочкою
        const backBtn = document.createElement('button');
        backBtn.className = 'settings-back-btn';
        backBtn.innerHTML = '← Налаштування';
        backBtn.style.cssText = `
            background: none;
            border: none;
            font-size: var(--font-18);
            font-weight: var(--font-semibold);
            color: var(--black);
            cursor: pointer;
            padding: var(--space-sm) 0;
            margin-bottom: var(--space-lg);
            width: 100%;
            text-align: left;
            transition: color var(--transition);
        `;

        // Заголовок
        const title = document.createElement('h3');
        title.textContent = 'Налаштування OCR';
        title.style.cssText = `
            margin: 0 0 var(--space-lg) 0;
            font-size: var(--font-24);
            font-weight: var(--font-semibold);
            color: var(--black);
            text-align: center;
        `;

        // Статус поточного ключа
        const currentStatus = this.createTokenStatusElement();

        // Кнопка "Додати новий ключ"
        const addBtn = document.createElement('button');
        addBtn.className = 'settings-option';
        addBtn.textContent = 'Додати новий ключ';

        // Кнопка "Видалити поточний ключ" (показуємо тільки якщо є ключ)
        const removeBtn = document.createElement('button');
        removeBtn.className = 'settings-option danger';
        removeBtn.textContent = 'Видалити поточний ключ';
        
        const hasToken = this.hasApiKey();
        if (!hasToken) {
            removeBtn.style.display = 'none';
        }

        // Кнопка "Назад" (внизу)
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'settings-option';
        cancelBtn.textContent = 'Назад';

        // Обробники подій
        backBtn.addEventListener('click', () => {
            this.closeTokenMenu(overlay);
            // Повертаємося в основне меню налаштувань
            if (typeof flashcardsManager !== 'undefined') {
                flashcardsManager.showSettingsMenu();
            }
        });

        addBtn.addEventListener('click', () => {
            this.closeTokenMenu(overlay);
            this.addNewToken();
        });

        removeBtn.addEventListener('click', () => {
            this.closeTokenMenu(overlay);
            this.removeCurrentToken();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeTokenMenu(overlay);
        });

        // Закриття по кліку на overlay
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeTokenMenu(overlay);
            }
        });

        // Збираємо меню
        menu.appendChild(backBtn);
        menu.appendChild(title);
        menu.appendChild(currentStatus);
        menu.appendChild(addBtn);
        menu.appendChild(removeBtn);
        menu.appendChild(cancelBtn);
        overlay.appendChild(menu);

        // Додаємо в DOM з анімацією slideLeft
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        menu.style.animation = 'slideLeft 0.3s ease';
    }

    createTokenStatusElement() {
        const statusContainer = document.createElement('div');
        statusContainer.style.cssText = `
            background: var(--shine-gray);
            border-radius: var(--radius);
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
            text-align: center;
        `;

        const hasToken = this.hasApiKey();
        const statusIcon = hasToken ? '✅' : '❌';
        const statusText = hasToken ? 'API ключ встановлено' : 'API ключ відсутній';
        const statusColor = hasToken ? 'var(--black)' : 'var(--dark)';

        statusContainer.innerHTML = `
            <div style="font-size: 24px; margin-bottom: var(--space-sm);">${statusIcon}</div>
            <div style="font-size: var(--font-18); font-weight: var(--font-semibold); color: ${statusColor};">
                ${statusText}
            </div>
        `;

        return statusContainer;
    }

    closeTokenMenu(overlay) {
        if (overlay && overlay.parentNode) {
            const menu = overlay.querySelector('.settings-menu');
            if (menu) {
                menu.style.animation = 'slideRight 0.3s ease';
            }
            setTimeout(() => {
                overlay.remove();
                document.body.style.overflow = '';
            }, 300);
        }
    }

    // Методи для роботи з API ключем

    hasApiKey() {
        const key = localStorage.getItem(this.apiKeyStorageKey);
        return key && key.trim().length > 0;
    }

    getCurrentApiKey() {
        return localStorage.getItem(this.apiKeyStorageKey);
    }

    async addNewToken() {
        try {
            console.log('Додавання нового API ключа...');

            // Отримуємо поточний ключ для показу в placeholder
            const currentKey = this.getCurrentApiKey();
            const placeholder = currentKey ? 'Введіть новий API ключ (замінить поточний)' : 'Введіть ваш OpenAI API ключ';

            // Запитуємо новий ключ
            const newKey = prompt(placeholder);
            
            if (!newKey) {
                console.log('Ключ не введено');
                return;
            }

            const trimmedKey = newKey.trim();

            // Валідуємо формат ключа
            if (!this.validateApiKeyFormat(trimmedKey)) {
                this.showNotification('Невірний формат API ключа. Ключ має починатися з "sk-"', 'error');
                return;
            }

            // Зберігаємо ключ
            localStorage.setItem(this.apiKeyStorageKey, trimmedKey);
            
            console.log('API ключ збережено');
            
            const message = currentKey ? 'API ключ замінено' : 'API ключ додано';
            this.showNotification(message, 'success');

        } catch (error) {
            console.error('Помилка додавання ключа:', error);
            this.showNotification('Помилка збереження ключа', 'error');
        }
    }

    async removeCurrentToken() {
        try {
            if (!this.hasApiKey()) {
                this.showNotification('API ключ відсутній', 'error');
                return;
            }

            // Підтвердження видалення
            const confirmed = confirm('Ви впевнені, що хочете видалити поточний API ключ?');
            
            if (!confirmed) {
                return;
            }

            // Видаляємо ключ
            localStorage.removeItem(this.apiKeyStorageKey);
            
            console.log('API ключ видалено');
            this.showNotification('API ключ видалено', 'success');

        } catch (error) {
            console.error('Помилка видалення ключа:', error);
            this.showNotification('Помилка видалення ключа', 'error');
        }
    }

    validateApiKeyFormat(key) {
        // Перевіряємо що ключ починається з sk- та має відповідний формат
        if (!key || typeof key !== 'string') {
            return false;
        }

        const trimmedKey = key.trim();
        
        // OpenAI API ключі зазвичай починаються з "sk-" та мають довжину близько 51 символ
        if (!trimmedKey.startsWith('sk-')) {
            return false;
        }

        // Перевіряємо мінімальну довжину
        if (trimmedKey.length < 20) {
            return false;
        }

        return true;
    }

    // Уніфіковані повідомлення (використовуємо ті ж стилі що і в додатку)
    showNotification(message, type = 'success') {
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
        
        console.log(`Token Notification (${type}):`, message);
    }

    // Публічні методи для використання з інших модулів

    // Метод для перевірки чи є ключ (для ocr.js)
    isApiKeyAvailable() {
        return this.hasApiKey();
    }

    // Метод для отримання ключа (для ocr.js)
    getApiKey() {
        return this.getCurrentApiKey();
    }

    // Метод для встановлення ключа програмно (якщо потрібно)
    setApiKey(key) {
        if (this.validateApiKeyFormat(key)) {
            localStorage.setItem(this.apiKeyStorageKey, key.trim());
            return true;
        }
        return false;
    }

    // Метод для очищення ключа
    clearApiKey() {
        localStorage.removeItem(this.apiKeyStorageKey);
    }

    // Метод для автоматичного відкриття налаштувань токенів (викликається з OCR)
    promptForApiKey() {
        console.log('Автоматичне відкриття налаштувань токенів з OCR...');
        
        // Показуємо повідомлення
        this.showNotification('Для OCR потрібен API ключ. Додайте ключ в налаштуваннях.', 'error');
        
        // Відкриваємо налаштування токенів через невелику затримку
        setTimeout(() => {
            this.showTokenSettings();
        }, 1500);
    }
}

// Створюємо глобальний екземпляр
console.log('Створюємо TokenManager...');
const tokenManager = new TokenManager();
console.log('TokenManager створено!');