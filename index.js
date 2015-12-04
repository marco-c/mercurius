#! /usr/bin/env node

var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
var redis = require('redis');
var webPush = require('web-push');
var exphbs  = require('express-handlebars');

var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

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

// load current data for
app.get('/', function(req, res) {
  res.render('index', { title: 'Hey', message: 'Hello there!'});
});

// adds a new machine and adds to a token set
// creates a new token set if needed
app.post('/register', function(req, res) {
  // add/update machine in database
  var machineId = req.body.machineId;
  new Promise(function(allfine, reject) {
    if (!req.body.token) {
      return allfine();
    }
    client.exists(req.body.token, function(err, result) {
      if (!result || err) {
        return reject();
      }
      allfine();
    });
  }).then(function() {
    client.hmset(machineId, {
      endpoint: req.body.endpoint,
      key: req.body.key,
      name: req.body.name,
      active: true
    }, function() {
      // check if token provided
      new Promise(function(resolve, reject) {
        if (req.body.token) {
          console.log('DEBUG: Registering machine ' + machineId + ' using existing token');
          resolve(req.body.token);
          return;
        }
        // creating a new token
        console.log('DEBUG: Creating a new token for machine ' + machineId);
        crypto.randomBytes(32, function(ex, buf) {
          resolve(buf.toString('hex'));
        });
      }).then(function(token) {
        // add to the token set only if not there already (multiple
        // notifications!)
        client.sismember(token, machineId, function(err, ismember) {
          if (ismember) {
            res.send(token);
            return;
          }
          client.sadd(token, req.body.machineId);
          res.send(token);
        });
      });
    });
  }, function() {
    console.log('DEBUG: Attempt to use a non existing token');
    res.sendStatus(404);
  });
});

// remove entire token set and all its machines
app.post('/unregister', function(req, res) {
  var token = req.body.token;
  client.exists(token, function(err, result) {
    if (!result) {
      res.sendStatus(404);
      return;
    }
    client.smembers(token, function(err, machines) {
      for (var index = 0; index < machines.length; index++) {
        client.del(machines[index]);
      }
      client.del(token, function(err) {
        res.sendStatus(200);
      });
    });
  });
});

// remove machine hash and its id from token set
app.post('/unregisterMachine', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;
  console.log('Unregistering machine: ' + machineId);
  client.exists(token, function(err, result) {
    if (!result) {
      res.sendStatus(404);
      return;
    }
    client.exists(machineId, function(err, result) {
      if (!result) {
        res.sendStatus(404);
        return;
      }
      client.del(machineId, function(err) {
        client.srem(token, machineId, function(err) {
          res.sendStatus(200);
        });
      });
    });
  });
});


// used only if registration is expired
// it's needed as happens on request from service worker which doesn't
// have any meta data
app.post('/updateRegistration', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;
  client.exists(token, function(err, exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }
    client.sismember(token, machineId, function(err, ismember) {
      if (!ismember) {
        res.sendStatus(404);
        return;
      }
      client.exists(machineId, function(err, exists) {
        if (!exists) {
          res.sendStatus(404);
          return;
        }
        client.hmset(machineId, {
          "endpoint": req.body.endpoint,
          "key": req.body.key
        }, function() {
          res.sendStatus(200);
        });
      });
    });
  });
});

// used only if metadata updated
// this happens on request to update meta data from front-end site
app.post('/updateMeta', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;
  client.exists(token, function(err, exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }
    client.sismember(token, machineId, function(err, ismember) {
      if (!ismember) {
        res.sendStatus(404);
        return;
      }
      client.exists(machineId, function(err, exists) {
        if (!exists) {
          res.sendStatus(404);
          return;
        }
        client.hmset(machineId, {
          "name": req.body.name,
          "active": req.body.active
        }, function() {
          res.sendStatus(200);
        });
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
    client.smembers(token, function(err, machines) {
      // send notification to all machines assigned to `token`
      for (var index = 0; index < machines.length; index++) {
        client.hgetall(machines[index], sendNotification);
      }
    });
  });

  function sendNotification(err, registration) {
    console.log('DEBUG: sending notification to: ' + registration.endpoint);
    webPush.sendNotification(
        registration.endpoint,
        req.body.ttl,
        registration.key,
        JSON.stringify(req.body.payload)
    ).then(function() {
      // XXX: this should happen after collecting data from all
      // notification attempts
      res.sendStatus(200);
    }, function(err) {
      console.log('Error in sending notification: ' + err);
      res.sendStatus(500);
    });
  }
});

if (!process.env.GCM_API_KEY) {
  console.warn('Set the GCM_API_KEY environment variable to support GCM');
}

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
