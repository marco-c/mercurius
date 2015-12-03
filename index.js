#! /usr/bin/env node

var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
var redis = require('redis');
var webPush = require('web-push');

var app = express();

var client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

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

if (!fs.existsSync('./dist')) {
  throw new Error('Missing `dist` folder, execute `npm run build` first.');
}
app.use(express.static('./dist'));

app.post('/register', function(req, res) {
  crypto.randomBytes(32, function(ex, buf) {
    var token = buf.toString('hex');

    // save token in database
    client.hmset(token, {
      endpoint: req.body.endpoint,
      key: req.body.key,
    }, function() {
      res.send(token);
    });
  });
});

app.post('/unregister', function(req, res) {
  var token = req.body.token;
  client.exists(token, function(err, result) {
    if (!result) {
      res.sendStatus(404);
      return;
    }
    client.del(token, function(err) {
      res.sendStatus(200);
    });
  });
});

app.post('/updateRegistration', function(req, res) {
  var token = req.body.token;
  client.exists(token, function(err, exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }
    client.hgetall(token, function(err, registration) {
      client.hmset(token, {
        "endpoint": req.body.endpoint,
        "key": req.body.key
      }, function() {
        res.sendStatus(200);
      });
    });
  });
});

app.post('/notify', function(req, res) {
  var token = req.body.token;
  client.exists(token, function(err, exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }
    client.hgetall(token, function(err, registration) {
      webPush.sendNotification(registration.endpoint, req.body.ttl, registration.key, JSON.stringify(req.body.payload))
      .then(function() {
        res.sendStatus(200);
      }, function(err) {
        res.sendStatus(500);
      });
    });
  });
});

webPush.setGCMAPIKey(process.env.GCM_API_KEY);

var port = process.env.PORT || 4000;
var ready = new Promise(function(resolve, reject) {
  app.listen(port, function(err) {
    if (err) {
      reject(err);
      return;
    }

    console.log('Mercurius listening on http://localhost:%d', port);

    resolve();
  });
});

module.exports = {
  app: app,
  ready: ready,
};
