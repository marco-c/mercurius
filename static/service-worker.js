self.addEventListener('push', function(event) {
  var data = event.data ? event.data.json() : null;

  var title = data ? data.title : 'Mercurius';
  var body = data ? data.body : 'Notification';

  event.waitUntil(self.registration.showNotification(title, {
    body: body,
  }));
});
