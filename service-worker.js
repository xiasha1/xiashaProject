const CACHE_VERSION = 6;
var staticCache = 'static-v'+CACHE_VERSION;
var imgCache = 'img-v'+ CACHE_VERSION;
var htmlCache = 'html-v' + CACHE_VERSION;
var OFFLINE_URL = '/offline.html';
var filesToCache = [ 
  '/',
	'http://localhost:9090/msite/mtomtop/css/product.css?v4.0.0',
  'http://localhost:9090/msite/mtomtop/css/login_register.css?v4.0.0',
  OFFLINE_URL
];

//SW安装
self.addEventListener('install', e=> {
  console.log('[sw]ServiceWorker Install');
  e.waitUntil(
    caches.open(staticCache).then(function(cache) {
      return cache.addAll(filesToCache)
      .then(function () {
        console.log('[sw]All files are cached');
        return self.skipWaiting();//跳过等待直接activate
      })
      .catch(function (error) {
        console.log('[sw]Failed to cache', error);
      })
    })
  );
});

//SW激活
self.addEventListener('activate', function(e) {
  console.log('[sw]ServiceWorker Activate');
  var arr = [htmlCache,staticCache];
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (arr.indexOf(key) === -1) {
          console.log('[sw]ServiceWorker Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();  //更新客户端
});

//SW fetch数据
// self.addEventListener('fetch', e => {
//   // abandon non-GET requests
//   if (e.request.method !== 'GET') return;
//   let url = e.request.url;
//   e.respondWith(
//     caches.open(cacheName)
//       .then(cache => {
//         return cache.match(e.request)
//           .then(response => {
//             if (response) {
//               // return cached file
//              //console.log('[sw]Found response in cache:', url);
//               return response;
//             }
//             // make network request
//             return fetch(e.request)
//               .then(newreq => {
//                 console.log('[sw]network fetch: ', url);
//                 if (newreq.ok) cache.put(e.request, newreq.clone());                
//                 return newreq;
//               })
//           });
//       })
//   );
// });

self.addEventListener('fetch', e=> {
  // console.info('Event: Fetch');
  var request = e.request;
  let url = e.request.url
  e.respondWith(
    //If request is already in cache, return it
    caches.match(request).then(function(response) {
      if (response) {
        console.log('[sw]Found response in cache:', url);
        return response;
      }
      //if request is not cached, add it to cache
      //console.log('[sw]No response found in cache. About to fetch from network...');
      return fetch(request).then(function(response) {
        var responseToCache = response.clone();
        //请求和响应流只能被读取一次。为了给浏览器返回响应以及把它缓存起来，我们不得不克隆一份。所以原始的会返回给浏览器，
        //克隆的会发送到缓存中。它们都是读取了一次
        caches.open(htmlCache).then(
          function(cache) {
            cache.put(request, responseToCache).catch(function(err) {
              console.warn(request.url + ': ' + err.message);
            });
          });
        console.log('[sw]Response from network is:', url);
        return response;
      });
    })
  );
});

// self.addEventListener('activate', e => e.waitUntil(
//     Promise.all([
//         // 更新客户端
//         clients.claim(),
//         // 清理旧版本
//         caches.keys().then(cacheList => Promise.all(
//             cacheList.map(cacheNames => {
//                 if (cacheNames !== cacheName) {
//                     console.info('[sw]ServiceWorker Removing old cache', cacheNames);
//                     caches.delete(cacheNames);
//                 }
//             })
//         ))
//     ])
// ));


// this.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.match(event.request).catch(function() {
//       return fetch(event.request).then(function(response) {
//         return caches.open('v1').then(function(cache) {
//           cache.put(event.request, response.clone());
//           return response;
//         });  
//       });
//     }).catch(function() {
//       return caches.match('/sw-test/gallery/myLittleVader.jpg');
//     })
//   );
// });

//Adding `push` event listener
self.addEventListener('push', e=> {
  console.info('Received a push message', e);
  var title = 'Push notification demo';
  var body = {
    'body': 'click to return to application',
    'tag': 'demo',
    'icon': '//statictest.tomtop.com/mtomtop/icon/apple-touch-icon.png',
    'badge': '//statictest.tomtop.com/mtomtop/icon/apple-touch-icon.png',
    //Custom actions buttons
    'actions': [
      { "action": "yes", "title": "I ♥ this app!"},
      { "action": "no", "title": "I don\'t like this app"}
    ]
  };

  e.waitUntil(self.registration.showNotification(title, body));
});

//Adding `notification` click event listener
self.addEventListener('notificationclick', e=> {
  var url = 'https://mtest.tomtop.com';

  //Listen to custom action buttons in push notification
  if (e.action === 'yes') {
    console.log('I ♥ this app!');
  }
  else if (e.action === 'no') {
    console.warn('I don\'t like this app');
  }
  e.notification.close(); //Close the notification
  //To open the app after clicking notification
  e.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        //If site is opened, focus to the site
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      //If site is cannot be opened, open in new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
    .catch(function (error) {
      console.error(error);
    })
  );
});

self.addEventListener('sync', e=> {
  console.info('Event: Sync');
  //Check registered sync name or emulated sync from devTools
  if (e.tag === 'demo') {
    e.waitUntil(
      //To check all opened tabs and send postMessage to those tabs
      self.clients.matchAll().then(function (all) {
        return all.map(function (client) {
          return client.postMessage('online'); //To make fetch request, check app.js - line no: 122
        })
      })
      .catch(function (error) {
        console.error(error);
      })
    );
  }
});


// window.addEventListener('beforeinstallprompt', function(e) {
//   // beforeinstallprompt Event fired

//   // e.userChoice will return a Promise. 
//   // For more details read: https://developers.google.com/web/fundamentals/getting-started/primers/promises
//   e.userChoice.then(function(choiceResult) {

//     console.log(choiceResult.outcome);

//     if(choiceResult.outcome == 'dismissed') {
//       console.log('User cancelled home screen install');
//     }
//     else {
//       console.log('User added to home screen');
//     }
//   });
// });


