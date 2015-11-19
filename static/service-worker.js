importScripts('localforage.min.js');

self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : null;

  var title = data ? data.title : 'Mercurius';
  var body = data ? data.body : 'Notification';

  event.waitUntil(self.registration.showNotification(title, {
    body: body,
  }));
});

self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    localforage.getItem('token').then(function(token) {
      if (!token) {
        return;
      }

      return self.registration.pushManager.subscribe({ userVisibleOnly: true }).then(function(subscription) {
        var key = subscription.getKey ? subscription.getKey('p256dh') : '';

        return fetch('./updateRegistration', {
          method: 'post',
          headers: {
            'Content-type': 'application/json'
          },
          body: JSON.stringify({
            token: token,
            endpoint: subscription.endpoint,
            key: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : '',
          }),
        });
      });
    })
  );
});
