var registrationPromise = navigator.serviceWorker.register('service-worker.js');

function register() {
  registrationPromise.then(function(registration) {
    return registration.pushManager.getSubscription().then(function(subscription) {
      if (subscription) {
        return subscription;
      }

      return registration.pushManager.subscribe({ userVisibleOnly: true }).then(function(newSubscription) {
        return newSubscription;
      });
    });
  }).then(function(subscription) {
    var key = subscription.getKey ? subscription.getKey('p256dh') : '';

    fetch('./register', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        key: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : '',
      }),
    }).then(function(response) {
      response.text().then(function(token) {
        document.getElementById('token').textContent = 'Your token is: ' + token;
      });
    });
  });
}

document.getElementById('register').onclick = register;
