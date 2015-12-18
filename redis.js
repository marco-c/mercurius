var redis = require('redis');

var client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

commands = {};

['set', 'get', 'del', 'exists', 'sismember', 'hmset', 'hget', 'smembers',
 'sadd', 'hgetall', 'srem']
.map(function(name) {
  commands[name] = function() {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(resolve, reject) {
      args.push(function(err, response) {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
      client[name].apply(client, args);
    });
  };
});

module.exports = commands;
