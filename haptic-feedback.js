console.log('=== haptic-feedback.js LOADED ===');

// Haptic Feedback Module - віброзворотний зв'язок для покращення UX
class HapticFeedbackManager {
    constructor() {
        this.isSupported = false;
        this.isEnabled = true;
        this.storageKey = 'haptic_feedback_enabled';
        
        this.init();
    }

    init() {
        console.log('HapticFeedbackManager initializing...');
        
        // Перевіряємо підтримку вібрації
        this.checkSupport();
        
        // Завантажуємо налаштування
        this.loadSettings();
        
        console.log('HapticFeedbackManager ready!', {
            supported: this.isSupported,
            enabled: this.isEnabled
        });
    }

    checkSupport() {
        // Перевіряємо підтримку Vibration API
        this.isSupported = 'vibrate' in navigator;
        
        if (!this.isSupported) {
            console.log('Vibration API не підтримується цим пристроєм');
        } else {
            console.log('Vibration API підтримується');
        }
    }

    loadSettings() {
        // Завантажуємо налаштування з localStorage
        const saved = localStorage.getItem(this.storageKey);
        if (saved !== null) {
            this.isEnabled = JSON.parse(saved);
        }
        
        console.log('Haptic feedback settings loaded:', this.isEnabled);
    }

    saveSettings() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.isEnabled));
        console.log('Haptic feedback settings saved:', this.isEnabled);
    }

    // ========== ОСНОВНІ МЕТОДИ ВІБРАЦІЇ ==========

    vibrate(pattern) {
        if (!this.canVibrate()) {
            return false;
        }

        try {
            const result = navigator.vibrate(pattern);
            console.log('Vibration triggered:', pattern, 'Success:', result);
            return result;
        } catch (error) {
            console.error('Vibration error:', error);
            return false;
        }
    }

    canVibrate() {
        return this.isSupported && this.isEnabled;
    }

    stopVibration() {
        if (this.isSupported) {
            navigator.vibrate(0);
        }
    }

    // ========== ПОПЕРЕДНЬО ВИЗНАЧЕНІ ШАБЛОНИ ВІБРАЦІЇ ==========

    // Короткий успішний тап (для успішних дій)
    success() {
        return this.vibrate([50]);
    }

    // Подвійний короткий тап (для додавання елементів)
    add() {
        return this.vibrate([30, 50, 30]);
    }

    // Довгий тап (для помилок)
    error() {
        return this.vibrate([200]);
    }

    // Три коротких тапи (для завершення процесу)
    complete() {
        return this.vibrate([40, 40, 40, 40, 40]);
    }

    // М'який короткий тап (для вибору)
    select() {
        return this.vibrate([25]);
    }

    // Середній тап (для важливих дій)
    important() {
        return this.vibrate([100]);
    }

    // Ритмічна вібрація (для довгих процесів)
    processing() {
        return this.vibrate([50, 100, 50, 100, 50]);
    }

    // Видалення - два різних за довжиною тапи
    delete() {
        return this.vibrate([80, 50, 120]);
    }

    // ========== СПЕЦІАЛЬНІ МЕТОДИ ДЛЯ ВАШОГО ДОДАТКУ ==========

    // Успішне розпізнавання тексту
    ocrSuccess() {
        console.log('Haptic: OCR Success');
        return this.complete(); // Три коротких тапи для успішного розпізнавання
    }

    // Помилка розпізнавання тексту
    ocrError() {
        console.log('Haptic: OCR Error');
        return this.error(); // Довгий тап для помилки
    }

    // Початок процесу OCR
    ocrStart() {
        console.log('Haptic: OCR Start');
        return this.select(); // Короткий тап на початок
    }

    // Фото завантажено
    photoLoaded() {
        console.log('Haptic: Photo Loaded');
        return this.select(); // М'який тап при завантаженні фото
    }

    // Додавання слів у словник
    wordsAdded(count = 1) {
        console.log('Haptic: Words Added:', count);
        
        if (count === 1) {
            return this.add(); // Подвійний тап для одного слова
        } else if (count <= 5) {
            return this.success(); // Короткий тап для декількох слів
        } else {
            return this.complete(); // Повний паттерн для багатьох слів
        }
    }

    // Видалення слова
    wordDeleted() {
        console.log('Haptic: Word Deleted');
        return this.delete(); // Спеціальний паттерн для видалення
    }

    // Вибір слова в чіпсах
    wordSelected() {
        console.log('Haptic: Word Selected');
        return this.select(); // М'який тап для вибору
    }

    // Експорт/імпорт завершено
    importExportComplete() {
        console.log('Haptic: Import/Export Complete');
        return this.complete(); // Повний паттерн успіху
    }

    // Перекладення завершено
    translationComplete() {
        console.log('Haptic: Translation Complete');
        return this.success(); // Короткий успішний тап
    }

    // Натискання на кнопку налаштувань
    settingsOpen() {
        console.log('Haptic: Settings Open');
        return this.select(); // М'який тап при відкритті меню
    }

    // Збереження налаштувань
    settingsSaved() {
        console.log('Haptic: Settings Saved');
        return this.success(); // Успішне збереження
    }

    // ========== НАЛАШТУВАННЯ ==========

    enable() {
        this.isEnabled = true;
        this.saveSettings();
        this.success(); // Підтвердження включення
        console.log('Haptic feedback enabled');
    }

    disable() {
        this.isEnabled = false;
        this.saveSettings();
        console.log('Haptic feedback disabled');
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.isEnabled;
    }

    // ========== ІНФОРМАЦІЙНІ МЕТОДИ ==========

    getStatus() {
        return {
            supported: this.isSupported,
            enabled: this.isEnabled,
            canVibrate: this.canVibrate()
        };
    }

    // Тестова вібрація для налаштувань
    test() {
        console.log('Testing haptic feedback...');
        return this.vibrate([100, 50, 100, 50, 200]);
    }

    // ========== ІНТЕГРАЦІЯ З НАЛАШТУВАННЯМИ ==========

    createSettingsToggle() {
        const toggle = document.createElement('button');
        toggle.className = 'settings-option';
        
        const updateToggleText = () => {
            const statusText = this.isEnabled ? 'ON' : 'OFF';
            const statusColor = this.isEnabled ? 'var(--accent)' : 'var(--dark)';
            toggle.innerHTML = `
                Vibration 
                <span style="float: right; color: ${statusColor}; font-weight: var(--font-semibold);">
                    ${statusText}
                </span>
            `;
        };

        updateToggleText();

        toggle.addEventListener('click', () => {
            const newState = this.toggle();
            updateToggleText();
            
            // Показуємо повідомлення про зміну стану
            const message = newState ? 'Vibration enabled' : 'Vibration disabled';
            if (typeof flashcardsManager !== 'undefined') {
                flashcardsManager.showNotification(message, 'success');
            }
        });

        return toggle;
    }

    // ========== ДОДАТКОВІ УТИЛІТИ ==========

    // Створює кастомну вібрацію з параметрами
    customVibration(intensity = 'medium', duration = 50) {
        const patterns = {
            light: Math.min(duration * 0.5, 30),
            medium: duration,
            strong: Math.min(duration * 1.5, 200)
        };

        const pattern = patterns[intensity] || patterns.medium;
        return this.vibrate([pattern]);
    }

    // Адаптивна вібрація залежно від успішності дії
    adaptiveSuccess(successRate = 1.0) {
        if (successRate >= 0.9) {
            return this.complete(); // Відмінний результат
        } else if (successRate >= 0.7) {
            return this.success(); // Хороший результат
        } else if (successRate >= 0.5) {
            return this.select(); // Середній результат
        } else {
            return this.error(); // Поганий результат
        }
    }

    // Вібрація для різних типів повідомлень
    notificationVibration(type = 'success') {
        switch (type) {
            case 'success':
                return this.success();
            case 'error':
                return this.error();
            case 'warning':
                return this.important();
            case 'info':
                return this.select();
            default:
                return this.select();
        }
    }

    // Вібрація для UI взаємодій
    buttonPress(buttonType = 'normal') {
        switch (buttonType) {
            case 'primary':
                return this.success();
            case 'danger':
                return this.important();
            case 'secondary':
                return this.select();
            default:
                return this.select();
        }
    }

    // Прогресивна вібрація для послідовних дій
    sequentialVibration(step = 1, totalSteps = 1) {
        if (step === totalSteps) {
            // Останній крок - повний успіх
            return this.complete();
        } else if (step === 1) {
            // Перший крок - початок
            return this.select();
        } else {
            // Проміжні кроки - прогрес
            return this.success();
        }
    }

    // ========== МЕТОДИ ДЛЯ ІНТЕГРАЦІЇ З ІНШИМИ МОДУЛЯМИ ==========

    // Інтеграція з камерою
    cameraFeedback(action) {
        switch (action) {
            case 'photo_taken':
                return this.photoLoaded();
            case 'processing_start':
                return this.ocrStart();
            case 'processing_complete':
                return this.ocrSuccess();
            case 'processing_error':
                return this.ocrError();
            default:
                return this.select();
        }
    }

    // Інтеграція з базою даних
    databaseFeedback(action, count = 1) {
        switch (action) {
            case 'words_added':
                return this.wordsAdded(count);
            case 'word_deleted':
                return this.wordDeleted();
            case 'export_complete':
                return this.importExportComplete();
            case 'import_complete':
                return this.importExportComplete();
            case 'translation_complete':
                return this.translationComplete();
            default:
                return this.select();
        }
    }

    // Інтеграція з UI елементами
    uiFeedback(element, action = 'click') {
        const elementType = element.className || element.type || 'default';
        
        if (elementType.includes('btn-primary')) {
            return this.buttonPress('primary');
        } else if (elementType.includes('danger')) {
            return this.buttonPress('danger');
        } else if (elementType.includes('word-chip')) {
            return this.wordSelected();
        } else if (elementType.includes('settings')) {
            return this.settingsOpen();
        } else {
            return this.buttonPress('normal');
        }
    }
}

// Створюємо глобальний екземпляр
console.log('Creating HapticFeedbackManager...');
const hapticManager = new HapticFeedbackManager();
console.log('HapticFeedbackManager created!');
