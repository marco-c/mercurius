var registrationPromise = navigator.serviceWorker.register('service-worker.js');

function register() {
  localforage.getItem('token').then(function(token) {
    if (token) {
      return;
    }

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
          localforage.setItem('token', token);
          document.getElementById('token').textContent = token;
          document.getElementById('registrationForm').style.display = 'none';
          document.getElementById('unregistrationForm').style.display = 'block';
        });
      });
    });
  });
}

document.getElementById('register').onclick = register;

document.getElementById('unregister').onclick = function() {
  localforage.getItem('token').then(function(token) {
    fetch('./unregister', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
      }),
    }).then(function(response) {
      document.getElementById('registrationForm').style.display = 'block';
      document.getElementById('unregistrationForm').style.display = 'none';
      document.getElementById('token').textContent = '';

      localforage.clear();
    });
  });
};

window.onload = function() {
  localforage.getItem('token').then(function(token) {
    if (token) {
      document.getElementById('registrationForm').style.display = 'none';
      document.getElementById('token').textContent = token;
    } else {
      document.getElementById('unregistrationForm').style.display = 'none';
    }
  });
}
