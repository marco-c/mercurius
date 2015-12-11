#! /usr/bin/env node

var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
var redis = require('./redis.js');
var webPush = require('web-push');
var exphbs  = require('express-handlebars');
var bwipjs = require('bwip-js');

var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

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
  res.render('index');
});

app.get('/devices/:token', function(req, res) {
  return sendMachines(req, res, req.params.token);
});

// get machines for the token and send them along with the token
function sendMachines(req, res, token) {
  if (!token) {
    throw new Error('No token provided');
  }

  var machines = {};
  var machineId;
  function machinePromise(machineId) {
    return redis.hgetall(machineId)
    .then(function(machine) {
      machines[machineId] = machine;
    });
  }

  return redis.smembers(token)
  .then(function(ids) {
    if (ids.length === 0) {
      res.sendStatus(404);
      return;
    }

    var promises = ids.map(machinePromise);

    return Promise.all(promises)
    .then(() => res.send({
      token: token,
      machines: machines
    }));
  });
}

// adds a new machine to a token set
// creates a new token set if needed
app.post('/register', function(req, res) {
  // add/update machine in database
  var machineId = req.body.machineId;
  new Promise(function(resolve, reject) {
    if (!req.body.token) {
      return resolve();
    }

    redis.exists(req.body.token).then(function(result) {
      if (!result) {
        reject();
      } else {
        resolve();
      }
    }, reject);
  }).then(function() {
    redis.hmset(machineId, {
      endpoint: req.body.endpoint,
      key: req.body.key,
      name: req.body.name,
      active: true
    }).then(function() {
      // check if token provided
      return new Promise(function(resolve, reject) {
        if (req.body.token) {
          console.log('DEBUG: Registering machine ' + machineId + ' using existing token');
          resolve(req.body.token);
          return;
        }
        // creating a new token
        console.log('DEBUG: Creating a new token for machine ' + machineId);
        crypto.randomBytes(8, function(ex, buf) {
          resolve(buf.toString('hex'));
        });
      })
      .then(function(token) {
        // add to the token set only if not there already (multiple
        // notifications!)
        return redis.sismember(token, machineId)
        .then(function(isMember) {
          if (isMember) {
            sendMachines(req, res, token);
            return;
          }

          return redis.sadd(token, req.body.machineId)
          .then(() => sendMachines(req, res, token));
        });
      });
    })
    .catch(function(err) {
      console.error(err);
      res.sendStatus(500);
    });
  }, function() {
    console.log('DEBUG: Attempt to use a non existing token');
    res.sendStatus(404);
  });
});

// remove entire token set and all its machines
app.post('/unregister', function(req, res) {
  var token = req.body.token;

  redis.exists(token)
  .then(function(result) {
    if (!result) {
      res.sendStatus(404);
      return;
    }

    return redis.smembers(token)
    .then(function(machines) {
      var promises = machines.map(function(machine) {
        return redis.del(machine);
      });

      return Promise.all(promises)
      .then(() => redis.del(token))
      .then(() => res.sendStatus(200));
    });
  })
  .catch(function(err) {
    console.error(err);
    res.sendStatus(500);
  });
});

// remove machine hash and its id from token set
app.post('/unregisterMachine', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;

  console.log('Unregistering machine: ' + machineId);

  redis.exists(token)
  .then(function(result) {
    if (!result) {
      res.sendStatus(404);
      return;
    }

    return redis.hgetall(machineId)
    .then(function(registration) {
      if (!registration) {
        res.sendStatus(404);
        return;
      }

      return redis.del(machineId)
      .then(function() {
        return redis.srem(token, machineId)
        .then(function() {
          // send notification to an endpoint to unregister itself
          var payload = JSON.stringify({
            title: 'unregister',
            body: 'called from unregisterMachine'
          });
          var promises = [];
          if (registration.endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
            promises.push(
                redis.set(token + '-payload', payload)
                .then(webPush.sendNotification(registration.endpoint)));
          } else {
            promises.push(
                webPush.sendNotification(registration.endpoint, undefined, registration.key, payload));
          }
          promises.push(sendMachines(req, res, token));
          return Promise.all(promises);
        });
      });
    });
  })
  .catch(function(err) {
    console.error(err);
    res.sendStatus(500);
  });
});


// used only if registration is expired
// it's needed as happens on request from service worker which doesn't
// have any meta data
app.post('/updateRegistration', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;

  redis.sismember(token, machineId)
  .then(function(isMember) {
    if (!isMember) {
      res.sendStatus(404);
      return;
    }

    return redis.exists(machineId)
    .then(function(exists) {
      if (!exists) {
        res.sendStatus(404);
        return;
      }

      return redis.hmset(machineId, {
        "endpoint": req.body.endpoint,
        "key": req.body.key
      })
      .then(() => res.sendStatus(200));
    });
  })
  .catch(function(err) {
    console.error(err);
    res.sendStatus(500);
  });
});

// used only if metadata updated
// this happens on request to update meta data from front-end site
app.post('/updateMeta', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;

  redis.sismember(token, machineId)
  .then(function(isMember) {
    if (!isMember) {
      res.sendStatus(404);
      return;
    }

    return redis.exists(machineId)
    .then(function(exists) {
      if (!exists) {
        res.sendStatus(404);
        return;
      }

      return redis.hmset(machineId, {
        "name": req.body.name,
        "active": req.body.active
      })
      .then(() => res.sendStatus(200));
    });
  })
  .catch(function(err) {
    console.error(err);
    res.sendStatus(500);
  });
});

app.post('/notify', function(req, res) {
  var token = req.body.token;

  redis.exists(token)
  .then(function(exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }

    return redis.smembers(token)
    .then(function(machines) {
      // send notification to all machines assigned to `token`
      if (!machines) {
        // XXX: Are we being too aggressive here?
        return redis.del(token)
        .then(() => { throw new Error('Broken token.'); });
      }

      var promises = machines.map(function(machine) {
        return redis.hgetall(machine)
        .then(function(registration) {
          console.log('DEBUG: sending notification to: ' + registration.endpoint);

          if (registration.endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
            return redis.set(token + '-payload', JSON.stringify(req.body.payload))
            .then(() => webPush.sendNotification(registration.endpoint, req.body.ttl));
          } else {
            return webPush.sendNotification(registration.endpoint, req.body.ttl, registration.key, JSON.stringify(req.body.payload));
          }
        });
      });

      return Promise.all(promises)
      .then(() => res.sendStatus(200));
    });
  })
  .catch(function(err) {
    console.error('Error in sending notification: ' + err);
    res.sendStatus(500);
  });
});

app.get('/getPayload/:token', function(req, res) {
  var hash = req.params.token + '-payload';

  redis.exists(hash)
  .then(function(exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }

    return redis.get(hash)
    .then(function(payload) {
      if (!payload) {
        res.sendStatus(404);
        return;
      }

      res.send(payload);
    });
  })
  .catch(function(err) {
    console.error(err);
    res.sendStatus(500);
  });
});

app.get('/generateBarcode/:token', function(req, res) {
  bwipjs.toBuffer({
    bcid: 'code128',
    text: req.params.token,
    includetext: true,
    textxalign: 'center',
  }, function (err, png) {
    if (err) {
      console.error(err);
      res.sendStatus(500);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(png, 'binary');
  });
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
