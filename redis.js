var redis = require('redis');

var client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

module.exports = {
  set: function(hash, value) {
    return new Promise(function(resolve, reject) {
      client.set(hash, value, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  get: function(hash) {
    return new Promise(function(resolve, reject) {
      client.get(hash, function(err, value) {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  },

  del: function(hash) {
    return new Promise(function(resolve, reject) {
      client.del(hash, function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  exists: function(hash) {
    return new Promise(function(resolve, reject) {
      client.exists(hash, function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  },

  sismember: function(key, member) {
    return new Promise(function(resolve, reject) {
      client.sismember(key, member, function(err, isMember) {
        if (err) {
          reject(err);
        } else {
          resolve(isMember);
        }
      });
    });
  },

  hmset: function(hash, object) {
    return new Promise(function(resolve, reject) {
      client.hmset(hash, object, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  smembers: function(hash) {
    return new Promise(function(resolve, reject) {
      client.smembers(hash, function(err, machines) {
        if (err) {
          reject(err);
        } else {
          resolve(machines);
        }
      });
    });
  },

  sadd: function(key, member) {
    return new Promise(function(resolve, reject) {
      client.sadd(key, member, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },

  hgetall: function(hash) {
    return new Promise(function(resolve, reject) {
      client.hgetall(hash, function(err, registration) {
        if (err) {
          reject(err);
        } else {
          resolve(registration);
        }
      });
    });
  },

  srem: function(key, member) {
    return new Promise(function(resolve, reject) {
      client.srem(key, member, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },
};

