var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
var webPush = require('web-push');
var app = express();

app.use(bodyParser.json());

app.use(function(req, res, next) {
  var host = req.get('Host');

  if (host.indexOf('localhost') !== 0 && host.indexOf('127.0.0.1') !== 0) {
    // https://developer.mozilla.org/en-US/docs/Web/Security/HTTP_strict_transport_security
    res.header('Strict-Transport-Security', 'max-age=15768000');
    // https://github.com/rangle/force-ssl-heroku/blob/master/force-ssl-heroku.js
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + host + req.url);
    }
  }
  return next();
});

app.use(function(req, res, next) {
  // http://enable-cors.org/server_expressjs.html
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
  next();
});

app.use(express.static('./static'));

// Map tokens to endpoints
var registrations = {};

app.post('/register', function(req, res) {
  crypto.randomBytes(32, function(ex, buf) {
    var token = buf.toString('hex');

    registrations[token] = {
      endpoint: req.body.endpoint,
      key: req.body.key,
    };

    res.send(token);
  });
});

app.post('/notify', function(req, res) {
  var registration = registrations[req.body.token];
  webPush.sendNotification(registration.endpoint, req.body.ttl, registration.key, req.body.payload);
});

var port = process.env.PORT || 3003;
var ready = new Promise(function(resolve, reject) {
  app.listen(port, function(err) {
    if (err) {
      reject(err);
      return;
    }
    console.log('app.listen on http://localhost:%d', port);
    resolve();
  });
});

module.exports = {
  app: app,
  ready: ready,
};
