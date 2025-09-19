console.log('=== Service Worker LOADED ===');

const CACHE_NAME = 'words-graber-v1.1.0';
const BASE_PATH = '/ocr-camera-app';

const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/pwa.js`,
  `${BASE_PATH}/database.js`,
  `${BASE_PATH}/flashcards.js`, 
  `${BASE_PATH}/token-manager.js`,
  `${BASE_PATH}/ocr.js`,
  `${BASE_PATH}/text.js`,
  `${BASE_PATH}/camera-words.js`,
  `${BASE_PATH}/utils.js`,
  `${BASE_PATH}/manifest.json`,
  
  // CDN ресурси
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  
  // Іконки - світла тема
  `${BASE_PATH}/icons/fi_book.svg`,
  `${BASE_PATH}/icons/Settings.svg`,
  `${BASE_PATH}/icons/Trash Bin Trash.svg`,
  `${BASE_PATH}/icons/icon-72x72.png`,
  `${BASE_PATH}/icons/icon-96x96.png`,
  `${BASE_PATH}/icons/icon-128x128.png`,
  `${BASE_PATH}/icons/icon-144x144.png`,
  `${BASE_PATH}/icons/icon-152x152.png`,
  `${BASE_PATH}/icons/icon-192x192.png`,
  `${BASE_PATH}/icons/icon-384x384.png`,
  `${BASE_PATH}/icons/icon-512x512.png`,
  `${BASE_PATH}/icons/favicon-16x16.png`,
  `${BASE_PATH}/icons/favicon-32x32.png`,
  
  // Apple Touch Icons - світла тема
  `${BASE_PATH}/icons/apple-touch-icon-57x57.png`,
  `${BASE_PATH}/icons/apple-touch-icon-60x60.png`,
  `${BASE_PATH}/icons/apple-touch-icon-72x72.png`,
  `${BASE_PATH}/icons/apple-touch-icon-76x76.png`,
  `${BASE_PATH}/icons/apple-touch-icon-114x114.png`,
  `${BASE_PATH}/icons/apple-touch-icon-120x120.png`,
  `${BASE_PATH}/icons/apple-touch-icon-144x144.png`,
  `${BASE_PATH}/icons/apple-touch-icon-152x152.png`,
  `${BASE_PATH}/icons/apple-touch-icon-167x167.png`,
  `${BASE_PATH}/icons/apple-touch-icon-180x180.png`,
  
  // Іконки - темна тема
  `${BASE_PATH}/icons/icon-72x72-dark.png`,
  `${BASE_PATH}/icons/icon-96x96-dark.png`,
  `${BASE_PATH}/icons/icon-128x128-dark.png`,
  `${BASE_PATH}/icons/icon-144x144-dark.png`,
  `${BASE_PATH}/icons/icon-152x152-dark.png`,
  `${BASE_PATH}/icons/icon-192x192-dark.png`,
  `${BASE_PATH}/icons/icon-384x384-dark.png`,
  `${BASE_PATH}/icons/icon-512x512-dark.png`,
  `${BASE_PATH}/icons/favicon-16x16-dark.png`,
  `${BASE_PATH}/icons/favicon-32x32-dark.png`,
  
  // Apple Touch Icons - темна тема
  `${BASE_PATH}/icons/apple-touch-icon-57x57-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-60x60-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-72x72-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-76x76-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-114x114-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-120x120-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-144x144-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-152x152-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-167x167-dark.png`,
  `${BASE_PATH}/icons/apple-touch-icon-180x180-dark.png`,
  
  // Shortcuts іконки
  `${BASE_PATH}/icons/camera-shortcut.png`,
  `${BASE_PATH}/icons/camera-shortcut-dark.png`,
  
  // Splash screens
  `${BASE_PATH}/icons/splash/iphone-x-splash.png`,
  `${BASE_PATH}/icons/splash/iphone-x-splash-dark.png`,
  `${BASE_PATH}/icons/splash/iphone-xr-splash.png`,
  `${BASE_PATH}/icons/splash/iphone-xr-splash-dark.png`,
  `${BASE_PATH}/icons/splash/iphone-12-splash.png`,
  `${BASE_PATH}/icons/splash/iphone-12-splash-dark.png`
];

// Встановлення Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Встановлення...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Кешування файлів...');
        return cache.addAll(urlsToCache.map(url => {
          // Обробляємо CDN URL без BASE_PATH
          if (url.startsWith('http')) {
            return url;
          }
          return url;
        }));
      })
      .then(() => {
        console.log('Service Worker: Файли закешовано');
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
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Видалення старого кешу:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
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
  
  // Ігноруємо запити до API
  if (url.hostname.includes('api.openai.com') || 
      url.hostname.includes('api.mymemory.translated.net') ||
      url.hostname.includes('translate.googleapis.com')) {
    return;
  }
  
  // Ігноруємо Chrome extension запити
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          console.log('Service Worker: Повертаємо з кешу:', request.url);
          return response;
        }
        
        return fetch(request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
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
  const { data } = event;
  
  if (data && data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Отримано команду SKIP_WAITING');
    self.skipWaiting();
  }
  
  if (data && data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
  
  if (data && data.type === 'THEME_CHANGED') {
    console.log('Service Worker: Theme changed to:', data.theme);
    
    // Повідомляємо всіх клієнтів про зміну теми
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'THEME_UPDATED',
          theme: data.theme
        });
      });
    });
  }
  
  if (data && data.type === 'ADD_TO_CACHE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        const urls = Array.isArray(data.urls) ? data.urls : [data.urls];
        return cache.addAll(urls);
      }).then(() => {
        console.log('Service Worker: Додано до кешу:', data.urls);
        
        // Повідомляємо клієнта про успішне кешування
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'CACHE_UPDATED',
            urls: data.urls
          });
        }
      }).catch(error => {
        console.error('Service Worker: Помилка додавання до кешу:', error);
      })
    );
  }
});

// Background Sync
self.addEventListener('sync', event => {
  console.log('Service Worker: Background Sync:', event.tag);
  
  if (event.tag === 'background-sync-words') {
    event.waitUntil(
      // Логіка синхронізації даних
      syncWordsData()
    );
  }
});

async function syncWordsData() {
  try {
    // Тут можна додати логіку синхронізації словника
    // коли з'явиться інтернет-з'єднання
    console.log('Service Worker: Синхронізація словника...');
    
    // Повідомляємо клієнтів про завершення синхронізації
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        success: true
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Помилка синхронізації:', error);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        success: false,
        error: error.message
      });
    });
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push notification отримано:', event);
  
  let notificationData;
  
  try {
    notificationData = event.data ? event.data.json() : {};
  } catch (error) {
    notificationData = {
      title: 'Words graber',
      body: 'Нове повідомлення від Words graber'
    };
  }
  
  const options = {
    body: notificationData.body || 'Нове повідомлення від Words graber',
    icon: `${BASE_PATH}/icons/icon-192x192.png`,
    badge: `${BASE_PATH}/icons/icon-72x72.png`,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: notificationData.id || 1,
      url: notificationData.url || `${BASE_PATH}/`
    },
    actions: [
      {
        action: 'open',
        title: 'Відкрити',
        icon: `${BASE_PATH}/icons/icon-72x72.png`
      },
      {
        action: 'close',
        title: 'Закрити'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'Words graber', options)
  );
});

// Обробка кліків по notification
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click:', event);
  
  event.notification.close();
  
  const targetUrl = event.notification.data.url || `${BASE_PATH}/`;
  
  if (event.action === 'close') {
    return;
  }
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // Перевіряємо чи є вже відкритий клієнт
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Якщо клієнта немає, відкриваємо новий
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

console.log('Service Worker: Ініціалізація завершена');
