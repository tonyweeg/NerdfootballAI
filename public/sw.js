const CACHE_NAME = 'nerdfootball-v3.1.0';

// NFL Team Helmet URLs for aggressive caching
const HELMET_URLS = [
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fari_Arizona_Cardinals.png?alt=media&token=38143dcd-6075-4fa3-9f3c-98518a6ec3f3',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fatl_Atlanta_Falcons.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fbal_Baltimore_Ravens.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fbuf_Buffalo_Bills.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fcar_Carolina_Panthers.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fchi_Chicago_Bears.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fcin_Cincinnati_Bengals.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fcle_Cleveland_Browns.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fdal_Dallas_Cowboys.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fden_Denver_Broncos.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fdet_Detroit_Lions.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fgb_Green_Bay_Packers.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fhou_Houston_Texans.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Find_Indianapolis_Colts.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fjax_Jacksonville_Jaguars.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fkc_Kansas_City_Chiefs.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Flv_Las_Vegas_Raiders.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Flac_Los_Angeles_Chargers.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Flar_Los_Angeles_Rams.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fmia_Miami_Dolphins.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fmin_Minnesota_Vikings.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fne_New_England_Patriots.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fno_New_Orleans_Saints.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fnyg_New_York_Giants.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fnyj_New_York_Jets.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fphi_Philadelphia_Eagles.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fpit_Pittsburgh_Steelers.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fsf_San_Francisco_49ers.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fsea_Seattle_Seahawks.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Ftb_Tampa_Bay_Buccaneers.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Ften_Tennessee_Titans.png?alt=media',
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fwas_Washington_Commanders.png?alt=media'
];

const urlsToCache = [
  '/',
  '/manifest.json',
  '/gameStateCache.js',
  ...HELMET_URLS
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Always serve helmet images from cache if available
  if (event.request.url.includes('nfl-logos%2F') && event.request.url.includes('firebasestorage.googleapis.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          // If not in cache, fetch and cache it
          return fetch(event.request)
            .then(fetchResponse => {
              if (!fetchResponse || fetchResponse.status !== 200) {
                return fetchResponse;
              }
              const responseToCache = fetchResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              return fetchResponse;
            });
        })
    );
    return;
  }

  // Skip caching for other Firebase, API calls, and external CDNs
  if (event.request.url.includes('firebaseapp.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('cloudfunctions.net') ||
      event.request.url.includes('tailwindcss.com') ||
      event.request.url.includes('.json')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If fetch fails, just return nothing to avoid errors
        return new Response('', { status: 200 });
      })
  );
});

// Listen for messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});