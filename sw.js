const CACHE_VERSION = 44;
const CACHE_PREFIX = 'tomtop-'
var OFFLINE_URL = '/offline.html';
var OFFLINE_IMG = '/msite/mtomtop/img/icon_wifi.png'
var prechcheArr = [
   OFFLINE_URL,OFFLINE_IMG
];
var staticCacheName = CACHE_PREFIX +'static-v' + CACHE_VERSION;
var networkCacheName = CACHE_PREFIX +'network-v'+ CACHE_VERSION;
var imgCacheName = CACHE_PREFIX +'img-v' + CACHE_VERSION;
var offlineName = CACHE_PREFIX + 'offline-v'+ CACHE_VERSION;
//导入sw-toolbox
importScripts('http://localhost:9090/msite/mcommon/js/sw-toolbox.js');
//预缓存离线图片和离线链接 
toolbox.options.cache.name = offlineName;
toolbox.precache(prechcheArr);
toolbox.options.debug = true;


//安装
self.addEventListener('install', function (event) {
     console.info('[sw]ServiceWorker Install');
    event.waitUntil(
        caches.open(offlineName).then(function (cache) {
            return cache.addAll(prechcheArr);
        })
    );
    return self.skipWaiting();
});

//离线存储跳offline页面
function offlinePge(request) {
  if (request.method === 'GET') {
      var headers = request.headers.get('accept');
      if (headers.includes('text/html')) {
          return caches.open(networkCacheName).then(function(cache) {
            return toolbox.cacheOnly(new Request(OFFLINE_URL), null, toolbox.options)
          })
      } 
      else if (headers.includes('image')) {
          if(request.url.indexOf('icon_wifi') > 0){
               return caches.open(networkCacheName).then(function(cache) {
                return toolbox.cacheOnly(new Request(OFFLINE_IMG), null, toolbox.options)
            })
          }
      }
  }
}
//图片、css、js等缓存优先  
toolbox.router.get('/*.(jpg|jpeg|png|svg|ico|css|js|eot|svg|ttf|woff)',  (request, values, options) => {
    return toolbox.cacheFirst(request, values, options).then(function(response) {
        return response || offlinePge(request)
    }).catch(function (response)  {
        return offlinePge(request)
    });
  },{
  cache: {
    name: staticCacheName,
    maxEntries: 100
  },
 // origin:/(static|staticdev|statictest|staticuat)\.tomtop\.com$/
});

//产品图片存储
toolbox.router.get('/*.(jpg|jpeg|png)',  (request, values, options) => {
    return toolbox.cacheFirst(request, values, options).then(function(response) {
        return response || offlinePge(request)
    }).catch(function (response)  {
        return offlinePge(request)
    });
  },{
  cache: {
    name: imgCacheName,
    maxEntries: 50
  },
  origin:/img\.tomtop\.com$/
});
//其他网络和缓存竞赛
toolbox.router.get('/(.*)', (request, values, options) => {
    return toolbox.fastest(request, values, options).then(function(response) {
        return response || offlinePge(request)
    }).catch(function (response)  {
        return offlinePge(request)
    });
},{
  cache: {
    name: networkCacheName,
    maxEntries: 100
  },
  origin: /localhost\:9090/
});


//激活
self.addEventListener('activate', function (event) {
    console.info('[sw]ServiceWorker Activate');
    var cacheArr = [staticCacheName,networkCacheName,imgCacheName,offlineName]
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.map(function (key) {
                    if (cacheArr.indexOf(key) === -1) {
                        console.log('[sw]ServiceWorker Removing old cache '+ key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

function clearAllCache() {
    return caches.keys().then(function (cacheNames) {
        return Promise.all(
            cacheNames.map(function (cacheName) {
                console.log('[sw]:clear all cache' + cacheName);
                return caches.delete(cacheName);
            })
        );
    });
}

function cleanCache() {
    var prefixRegexp = new RegExp(CACHE_PREFIX, "i");
    var versionRegexp = new RegExp(CACHE_VERSION, "i");
    return caches.keys().then(function(cacheNames) {
        return Promise.all(cacheNames.filter(function(cacheName) {
            return prefixRegexp.test(cacheName) && !versionRegexp.test(cacheName)
        }).map(function(cacheName) {
           console.log('[sw]:delete '+ cacheName);
            return caches.delete(cacheName)
        }))
    })
}
//clearCache();

//Adding `push` event listener
self.addEventListener('push', e=> {
  console.log('aaaaaaaaaa');
  console.log('Received a push message', e);
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


self.addEventListener("unhandledrejection",
    function(event) {
    if (/Quota exceeded/i.test(event.reason)) {
        clearAllCache()
    }
});

self.addEventListener("error",function(event) {
    console.log('[sw]:event.message:'+ event.message);
    console.log('[sw]:event.filename:'+ event.filename);
    console.log('[sw]:lineno:'+ lineno);
    console.log('[sw]:stack:'+ event.error && event.error.stack);
});

//Adding `notification` click event listener
self.addEventListener('notificationclick', e=> {
  var url = 'https:localhost:9090';
  console.log('1111');
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



