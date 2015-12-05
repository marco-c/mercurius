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

function redisSet(hash, value) {
  return new Promise(function(resolve, reject) {
    client.set(hash, value, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function redisGet(hash) {
  return new Promise(function(resolve, reject) {
    client.get(hash, function(err, value) {
      if (err) {
        reject(err);
      } else {
        resolve(value);
      }
    });
  });
}

function redisDel(hash) {
  return new Promise(function(resolve, reject) {
    client.del(hash, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function redisExists(hash) {
  return new Promise(function(resolve, reject) {
    client.exists(hash, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function redisSismember(key, member) {
  return new Promise(function(resolve, reject) {
    client.sismember(key, member, function(err, isMember) {
      if (err) {
        reject(err);
      } else {
        resolve(isMember);
      }
    });
  });
}

function redisHmset(hash, object) {
  return new Promise(function(resolve, reject) {
    client.hmset(hash, object, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function redisSmembers(hash) {
  return new Promise(function(resolve, reject) {
    client.smembers(hash, function(err, machines) {
      if (err) {
        reject(err);
      } else {
        resolve(machines);
      }
    });
  });
}

function redisSadd(key, member) {
  return new Promise(function(resolve, reject) {
    client.sadd(key, member, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function redisHgetall(hash) {
  return new Promise(function(resolve, reject) {
    client.hgetall(hash, function(err, registration) {
      if (err) {
        reject(err);
      } else {
        resolve(registration);
      }
    });
  });
}

function redisSrem(key, member) {
  return new Promise(function(resolve, reject) {
    client.srem(key, member, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

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

// adds a new machine to a token set
// creates a new token set if needed
app.post('/register', function(req, res) {
  // add/update machine in database
  var machineId = req.body.machineId;
  new Promise(function(resolve, reject) {
    if (!req.body.token) {
      return resolve();
    }

    redisExists(req.body.token).then(function(result) {
      if (!result) {
        reject();
      } else {
        resolve();
      }
    }, reject);
  }).then(function() {
    redisHmset(machineId, {
      endpoint: req.body.endpoint,
      key: req.body.key,
      name: req.body.name,
      active: true
    })
    .then(function() {
      // check if token provided
      return new Promise(function(resolve, reject) {
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
        return redisSismember(token, machineId)
        .then(function(isMember) {
          if (isMember) {
            res.send(token);
            return;
          }

          return redisSadd(token, req.body.machineId)
          .then(() => res.send(token));
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

  redisExists(token)
  .then(function(result) {
    if (!result) {
      res.sendStatus(404);
      return;
    }

    return redisSmembers(token)
    .then(function(machines) {
      var promises = machines.map(function(machine) {
        return redisDel(machine);
      });

      return Promise.all(promises)
      .then(() => redisDel(token))
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

  redisExists(token)
  .then(function(result) {
    if (!result) {
      res.sendStatus(404);
      return;
    }

    return redisExists(machineId)
    .then(function(result) {
      if (!result) {
        res.sendStatus(404);
        return;
      }

      return redisDel(machineId)
      .then(function() {
        return redisSrem(token, machineId)
        .then(() => res.sendStatus(200));
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

  redisSismember(token, machineId)
  .then(function(isMember) {
    if (!isMember) {
      res.sendStatus(404);
      return;
    }

    return redisExists(machineId)
    .then(function(exists) {
      if (!exists) {
        res.sendStatus(404);
        return;
      }

      return redisHmset(machineId, {
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

  redisSismember(token, machineId)
  .then(function(isMember) {
    if (!isMember) {
      res.sendStatus(404);
      return;
    }

    return redisExists(machineId)
    .then(function(exists) {
      if (!exists) {
        res.sendStatus(404);
        return;
      }

      return redisHmset(machineId, {
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

  redisExists(token)
  .then(function(exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }

    return redisSmembers(token)
    .then(function(machines) {
      // send notification to all machines assigned to `token`
      if (!machines) {
        // XXX: Are we being too aggressive here?
        return redisDel(token)
        .then(() => { throw new Error('Broken token.'); });
      }

      var promises = machines.map(function(machine) {
        return redisHgetall(machine)
        .then(function(registration) {
          console.log('DEBUG: sending notification to: ' + registration.endpoint);

          if (registration.endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
            return redisSet(token + '-payload', JSON.stringify(req.body.payload))
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

app.get('/getPayload', function(req, res) {
  var hash = req.body.token + '-payload';

  redisExists(hash)
  .then(function(exists) {
    if (!exists) {
      res.sendStatus(404);
      return;
    }

    return redisGet(hash)
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
