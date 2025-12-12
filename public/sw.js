const CACHE_NAME = 'turn-up-golf-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // 빌드 후 생성되는 JS, CSS 파일 경로를 여기에 추가해야 하지만,
  // 동적으로 변하는 파일명을 처리하기 위해 fetch 이벤트에서 캐싱합니다.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 캐시에 있으면 캐시에서 반환
        if (response) {
          return response;
        }

        // 캐시에 없으면 네트워크에서 가져옴
        return fetch(event.request).then(
          response => {
            // 유효한 응답이 아니면 그대로 반환
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 유효한 응답이면 복제해서 캐시에 저장하고 반환
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

// 오래된 캐시 정리
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});