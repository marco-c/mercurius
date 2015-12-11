importScripts('localforage.min.js');

self.addEventListener('push', function(event) {
  function getPayload() {
    if (event.data) {
      return Promise.resolve(event.data.json());
    } else {
      return localforage.getItem('token')
      .then(function(token) {
        if (!token) {
          return null;
        }

        return fetch('./getPayload/' + token)
        .then(function(response) {
          return response.json();
        });
      });
    }
  }

  event.waitUntil(
    getPayload()
    .then(function(data) {
      var title = data ? data.title : 'Mercurius';
      var body = data ? data.body : 'Notification';
      if (title === 'unregister') {
        return localforage.removeItem('token')
        .then(function() {
          self.registration.pushManager.getSubscription()
          .then(function(subscription) {
            subscription.unsubscribe();
          });
        });
      }
      return self.registration.showNotification(title, {
        body: body,
      });
    })
  );
});

self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    localforage.getItem('token')
    .then(function(token) {
      if (!token) {
        return;
      }

      localforage.getItem('machineId')
      .then(function(machineId) {
        return self.registration.pushManager.subscribe({ userVisibleOnly: true })
        .then(function(subscription) {
          var key = subscription.getKey ? subscription.getKey('p256dh') : '';

          return fetch('./updateRegistration', {
            method: 'post',
            headers: {
              'Content-type': 'application/json'
            },
            body: JSON.stringify({
              token: token,
              machineId: machineId,
              endpoint: subscription.endpoint,
              key: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : '',
            }),
          });
        });
      });
    })
  );
});
