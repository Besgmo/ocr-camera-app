console.log('=== gpt-ocr.js ЗАВАНТАЖЕНО ===');

class GPT4OCR {
    constructor() {
        this.statusEl = document.getElementById('status');
    }

    updateStatus(message, type = 'default') {
        if (this.statusEl) {
            this.statusEl.textContent = message;
            this.statusEl.className = `status ${type}`;
        }
        console.log(`Status (${type}):`, message);
    }

    async ensureApiKey() {
        // Використовуємо tokenManager замість власної логіки
        if (typeof tokenManager === 'undefined') {
            throw new Error("Token Manager недоступний");
        }

        if (!tokenManager.isApiKeyAvailable()) {
            // Замість prompt показуємо повідомлення та відкриваємо налаштування
            this.updateStatus('Потрібен API ключ. Відкрийте налаштування токенів.', 'error');
            
            // Можна автоматично відкрити налаштування токенів
            if (typeof flashcardsManager !== 'undefined') {
                setTimeout(() => {
                    if (typeof tokenManager !== 'undefined') {
                        tokenManager.showTokenSettings();
                    }
                }, 1000);
            }
            
            throw new Error("API ключ не встановлений");
        }

        return tokenManager.getApiKey();
    }

    async processImage(canvas) {
        try {
            this.updateStatus('Розпізнавання тексту...', 'processing');
            const apiKey = await this.ensureApiKey();

            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            const base64Data = dataURL.split(',')[1];

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Витягни весь текст з цього зображення. Поверни лише текст без коментарів."
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:image/jpeg;base64,${base64Data}`,
                                        detail: "high"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                console.error("API Error Response:", errorData);

                if (response.status === 401) {
                    // API ключ невірний, показуємо помилку та відкриваємо налаштування
                    this.updateStatus('Невірний API ключ. Оновіть ключ в налаштуваннях.', 'error');
                    
                    // Можна автоматично відкрити налаштування через деякий час
                    setTimeout(() => {
                        if (typeof tokenManager !== 'undefined') {
                            tokenManager.showTokenSettings();
                        }
                    }, 2000);
                    
                    throw new Error("Невірний або прострочений API ключ");
                }

                const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;
                throw new Error(`Помилка API: ${errorMessage}`);
            }

            const data = await response.json();
            console.log("Full API Response:", data);

            const text = data.choices?.[0]?.message?.content || "";
            if (!text.trim()) throw new Error("Текст не розпізнано або порожній");

            this.updateStatus('Текст розпізнано!', 'success');
            console.log("OCR Result:", text);

            // Розбиваємо на слова
            const words = text
                .split(/\s+/)
                .map(w => w.replace(/[^a-zA-Zа-яА-ЯіїєґІЇЄҐ0-9']/g, "")) // залишаємо літери/цифри
                .filter(w => w.length > 1);

            const result = { text, words };

            // Передаємо у твій popup/чіпси
            if (typeof textProcessor !== 'undefined') {
                textProcessor.processText(result);
            }

            return result;

        } catch (error) {
            console.error("GPT OCR Error:", error);
            this.updateStatus(`Помилка OCR: ${error.message}`, "error");
            throw error;
        }
    }

    reset() {
        this.updateStatus('Готово до фото');
        if (typeof textProcessor !== 'undefined') {
            textProcessor.reset();
        }
    }
}

console.log('Створюємо GPT4OCR...');
const ocrProcessor = new GPT4OCR();
console.log('GPT4OCR створено!');
