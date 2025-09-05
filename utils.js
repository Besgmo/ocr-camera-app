console.log('=== utils.js ЗАВАНТАЖЕНО ===');

// Utility функції для завантаження компонентів та навігації
class Utils {
    
    // Завантаження навігації в контейнер
    static async loadNavigation() {
        try {
            console.log('Завантаження навігації...');
            
            const response = await fetch('nav.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const navContainer = document.getElementById('nav-container');
            
            if (navContainer) {
                navContainer.innerHTML = html;
                console.log('Навігація завантажена');
                
                // Налаштовуємо навігацію після завантаження
                Utils.setupNavigation();
            } else {
                console.error('nav-container не знайдено');
            }
            
        } catch (error) {
            console.error('Помилка завантаження навігації:', error);
        }
    }
    
    // Налаштування обробників подій для навігації
    static setupNavigation() {
        console.log('Налаштування навігації...');
        
        // Змінено селектор з .nav-btn на .btn-nav
        const navButtons = document.querySelectorAll('.btn-nav');
        
        if (navButtons.length === 0) {
            console.error('Навігаційні кнопки не знайдено');
            return;
        }
        
        // Встановлюємо активну кнопку на основі поточної сторінки
        Utils.setActiveNavButton();
        
        // Додаємо обробники кліків
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const section = button.dataset.section;
                Utils.navigateToSection(section);
            });
        });
        
        // Додаємо обробник клавіш
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        Utils.navigateToSection('camera');
                        break;
                    case '2':
                        e.preventDefault();
                        Utils.navigateToSection('flashcards');
                        break;
                }
            }
        });
        
        console.log('Навігація налаштована');
    }
    
    // Встановлення активної кнопки на основі поточної сторінки
    static setActiveNavButton() {
        const currentPage = Utils.getCurrentPage();
        // Змінено селектор з .nav-btn на .btn-nav
        const navButtons = document.querySelectorAll('.btn-nav');
        
        navButtons.forEach(button => {
            button.classList.remove('active');
            
            const section = button.dataset.section;
            if ((currentPage === 'index' && section === 'camera') ||
                (currentPage === 'words' && section === 'flashcards')) {
                button.classList.add('active');
            }
        });
    }
    
    // Отримання назви поточної сторінки
    static getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop();
        
        if (page === 'words.html') return 'words';
        if (page === 'index.html' || page === '') return 'index';
        
        return 'index'; // fallback
    }
    
    // Навігація між секціями
    static navigateToSection(section) {
        console.log(`Навігація до секції: ${section}`);
        
        switch(section) {
            case 'camera':
                if (Utils.getCurrentPage() !== 'index') {
                    window.location.href = 'index.html';
                }
                break;
            case 'flashcards':
                if (Utils.getCurrentPage() !== 'words') {
                    window.location.href = 'words.html';
                }
                break;
            default:
                console.error(`Невідома секція: ${section}`);
        }
    }
    
    // Завантаження будь-якого HTML компонента
    static async loadComponent(componentPath, containerId) {
        try {
            console.log(`Завантаження компонента: ${componentPath}`);
            
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            const container = document.getElementById(containerId);
            
            if (container) {
                container.innerHTML = html;
                console.log(`Компонент ${componentPath} завантажено в ${containerId}`);
                return true;
            } else {
                console.error(`Контейнер ${containerId} не знайдено`);
                return false;
            }
            
        } catch (error) {
            console.error(`Помилка завантаження компонента ${componentPath}:`, error);
            return false;
        }
    }
    
    // Ініціалізація утиліт при завантаженні DOM
    static init() {
        console.log('Ініціалізація Utils...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                Utils.loadNavigation();
            });
        } else {
            Utils.loadNavigation();
        }
    }
    
    // Додаткові утилітні функції
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    // Форматування дати
    static formatDate(date) {
        return new Date(date).toLocaleDateString('uk-UA');
    }
    
    // Перевірка чи елемент видимий
    static isElementVisible(element) {
        return element && element.offsetParent !== null;
    }
}

// Автоматична ініціалізація
Utils.init();

// Експорт для використання в інших модулях
window.Utils = Utils;