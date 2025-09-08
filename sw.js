console.log('=== Service Worker LOADED ===');

const CACHE_NAME = 'ocr-dictionary-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/database.js',
  '/flashcards.js', 
  '/token-manager.js',
  '/ocr.js',
  '/text.js',
  '/camera-words.js',
  '/manifest.json',
  // CDN ресурси (важливо кешувати)
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  // Іконки (додайте ваші іконки)
  '/icons/fi_book.svg',
  '/icons/Settings.svg',
  '/icons/Trash Bin Trash.svg'
];

// Встановлення Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Встановлення...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Кешування файлів...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Файли закешовано');
        // Примусово активувати новий SW
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Помилка кешування:', error);
      })
  );
});

// Активація Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Активація...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Видаляємо старі кеші
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Видалення старого кешу:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Взяти контроль над усіма сторінками
      return self.clients.claim();
    })
  );
});

// Перехоплення запитів
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ігноруємо non-GET запити
  if (request.method !== 'GET') {
    return;
  }
  
  // Ігноруємо запити до API (OpenAI, MyMemory)
  if (url.hostname.includes('api.openai.com') || 
      url.hostname.includes('api.mymemory.translated.net')) {
    return;
  }
  
  // Ігноруємо Chrome extension запити
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then(response => {
        // Повертаємо з кешу якщо є
        if (response) {
          console.log('Service Worker: Повертаємо з кешу:', request.url);
          return response;
        }
        
        // Інакше завантажуємо з мережі та кешуємо
        return fetch(request).then(response => {
          // Перевіряємо чи це валідна відповідь
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Клонуємо відповідь для кешування
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log('Service Worker: Кешуємо новий ресурс:', request.url);
              cache.put(request, responseToCache);
            });
          
          return response;
        }).catch(error => {
          console.error('Service Worker: Помилка завантаження:', request.url, error);
          
          // Для навігаційних запитів повертаємо index.html з кешу
          if (request.destination === 'document') {
            return caches.match(`${BASE_PATH}/index.html`) || caches.match(`${BASE_PATH}/`);
          }
          
          throw error;
        });
      })
  );
});

// Обробка повідомлень від клієнта
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Отримано команду SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
});

// Background Sync (для offline функціональності)
self.addEventListener('sync', event => {
  console.log('Service Worker: Background Sync:', event.tag);
  
  if (event.tag === 'background-sync-words') {
    event.waitUntil(
      // Тут можна додати логіку синхронізації даних
      // коли з'явиться інтернет-з'єднання
      Promise.resolve()
    );
  }
});

// Push notifications (для майбутніх функцій)
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification отримано:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Нове повідомлення від OCR Dictionary',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('OCR Dictionary', options)
  );
});

// Обробка кліків по notification
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('Service Worker: Ініціалізація завершена');
