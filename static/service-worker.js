self.addEventListener('push', function(event) {
  event.waitUntil(self.registration.showNotification('Mercurius', {
    body: 'Notification!',
  }));
});
