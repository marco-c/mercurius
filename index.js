#! /usr/bin/env node

var fs = require('fs');
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');
var redis = require('./redis.js');
var webPush = require('web-push');
var exphbs  = require('express-handlebars');

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

// get machines for the token and send them along with the token
function sendMachines(res, token) {
  var machines = {};

  return redis.smembers(token)
  .then(function(ids) {
    if (!ids || ids.length === 0) {
      throw new Error('Not Found');
    }

    var promises = ids.map(function(machineId) {
      return redis.hgetall(machineId)
      .then(function(machine) {
        machines[machineId] = machine;
      });
    });

    return Promise.all(promises);
  })
  .then(() => res.send({
    token: token,
    machines: machines
  }));
}

function randomBytes(len) {
  return new Promise(function(resolve, reject) {
    crypto.randomBytes(len, function(err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

function handleError(res, err) {
  if (err && err.message === "Not Found") {
    res.sendStatus(404);
  } else {
    console.error(err);
    res.sendStatus(500);
  }
}

app.get('/devices/:token', function(req, res) {
  return sendMachines(res, req.params.token)
  .catch(err => handleError(res, err));
});

// adds a new machine to a token set
// creates a new token set if needed
app.post('/register', function(req, res) {
  // add/update machine in database
  var machineId = req.body.machineId;
  var token = req.body.token;

  var getTokenPromise;

  if (!req.body.token) {
    console.log('DEBUG: Creating a new token for machine ' + machineId);

    getTokenPromise = randomBytes(8)
    .then(res => token = res.toString('hex'));
  } else {
    console.log('DEBUG: Registering machine ' + machineId + ' using existing token ' + token);

    getTokenPromise = redis.exists(token)
    .then(function(exists) {
      if (!exists) {
        console.log('DEBUG: Attempt to use a non existing token: ' + token);
        throw new Error('Not Found');
      }
    });
  }

  getTokenPromise
  .then(function() {
    return redis.hmset(machineId, {
      endpoint: req.body.endpoint,
      key: req.body.key,
      name: req.body.name,
      active: true
    });
  })
  .then(() => redis.sismember(token, machineId))
  .then(function(isMember) {
    // add to the token set only if not there already (multiple
    // notifications!)
    if (!isMember) {
      return redis.sadd(token, machineId);
    }
  })
  .then(() => sendMachines(res, token))
  .catch(err => handleError(res, err));
});

// remove entire token set and all its machines
app.post('/unregister', function(req, res) {
  var token = req.body.token;

  redis.smembers(token)
  .then(function(machines) {
    if (!machines || machines.length === 0) {
      throw new Error('Not Found');
    }

    return Promise.all(machines.map(machine => redis.del(machine)));
  })
  .then(() => redis.del(token))
  .then(() => res.sendStatus(200))
  .catch(err => handleError(res, err));
});

function sendNotification(token, registration, payload, ttl) {
  console.log('DEBUG: sending notification to: ' + registration.endpoint);

  if (registration.endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
    return redis.set(token + '-payload', payload)
    .then(webPush.sendNotification(registration.endpoint, ttl));
  }

  return webPush.sendNotification(registration.endpoint, ttl, registration.key, payload);
}

// remove machine hash and its id from token set
app.post('/unregisterMachine', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;

  console.log('Unregistering machine: ' + machineId);

  redis.exists(token)
  .then(function(result) {
    if (!result) {
      throw new Error('Not Found');
    }

    return redis.hgetall(machineId);
  })
  .then(function(registration) {
    if (!registration) {
      throw new Error('Not Found');
    }

    return redis.del(machineId)
    .then(() => redis.srem(token, machineId))
    .then(function() {
      // send notification to an endpoint to unregister itself

      var payload = JSON.stringify({
        title: 'unregister',
        body: 'called from unregisterMachine'
      });

      return sendNotification(token, registration, payload);
    });
  })
  .then(() => sendMachines(res, token))
  .catch(err => handleError(res, err));
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
      throw new Error('Not Found');
    }

    return redis.exists(machineId);
  })
  .then(function(exists) {
    if (!exists) {
      throw new Error('Not Found');
    }

    return redis.hmset(machineId, {
      "endpoint": req.body.endpoint,
      "key": req.body.key
    });
  })
  .then(() => res.sendStatus(200))
  .catch(err => handleError(res, err));
});

// used only if metadata updated
// this happens on request to update meta data from front-end site
app.post('/updateMeta', function(req, res) {
  var token = req.body.token;
  var machineId = req.body.machineId;

  redis.sismember(token, machineId)
  .then(function(isMember) {
    if (!isMember) {
      throw new Error('Not Found');
    }

    return redis.exists(machineId);
  })
  .then(function(exists) {
    if (!exists) {
      throw new Error('Not Found');
    }

    return redis.hmset(machineId, {
      "name": req.body.name,
      "active": req.body.active
    });
  })
  .then(() => res.sendStatus(200))
  .catch(err => handleError(res, err));
});

app.post('/notify', function(req, res) {
  var token = req.body.token;

  redis.smembers(token)
  .then(function(machines) {
    // send notification to all machines assigned to `token`
    if (!machines || machines.length === 0) {
      throw new Error('Not Found');
    }

    var promises = machines.map(function(machine) {
      return redis.hgetall(machine)
      .then(registration => sendNotification(token, registration, JSON.stringify(req.body.payload), req.body.ttl));
    });

    return Promise.all(promises);
  })
  .then(() => res.sendStatus(200))
  .catch(err => handleError(res, err));
});

app.get('/getPayload/:token', function(req, res) {
  var hash = req.params.token + '-payload';

  redis.get(hash)
  .then(function(payload) {
    if (!payload) {
      throw new Error('Not Found');
    }

    res.send(payload);
  })
  .catch(err => handleError(res, err));
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
