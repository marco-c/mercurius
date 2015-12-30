var mercurius = require('../index.js');
var request = require('supertest');
var redis = require('../redis.js');

describe('mercurius redis errors', function() {
  var origCommands = {};

  before(function() {
    ['set', 'get', 'del', 'exists', 'sismember', 'hmset', 'hget', 'smembers',
     'sadd', 'hgetall', 'srem', 'select', 'flushdb']
    .map(function(name) {
      origCommands[name] = redis[name];
      redis[name] = function() {
        return Promise.reject(new Error('Fake error.'));
      };
    });
  });

  after(function() {
    ['set', 'get', 'del', 'exists', 'sismember', 'hmset', 'hget', 'smembers',
     'sadd', 'hgetall', 'srem', 'select', 'flushdb']
    .map(function(name) {
      redis[name] = origCommands[name];
    });
  });

  it('/devices fails with 500', function(done) {
    request(mercurius.app)
    .get('/devices/aToken')
    .expect(500, done);
  });

  it('/register fails with 500', function(done) {
    request(mercurius.app)
    .post('/register')
    .send()
    .expect(500, done);
  });

  it('/unregister fails with 500', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: 'aToken',
    })
    .expect(500, done);
  });

  it('/unregisterMachine fails with 500', function(done) {
    request(mercurius.app)
    .post('/unregisterMachine')
    .send({
      token: 'aToken',
      machineId: 'aMachine',
    })
    .expect(500, done);
  });

  it('/updateRegistration fails with 500', function(done) {
    request(mercurius.app)
    .post('/updateRegistration')
    .send({
      token: 'aToken',
      machineId: 'aMachine',
    })
    .expect(500, done);
  });

  it('/updateMeta fails with 500', function(done) {
    request(mercurius.app)
    .post('/updateMeta')
    .send({
      token: 'aToken',
      machineId: 'aMachine',
    })
    .expect(500, done);
  });

  it('/notify fails with 500', function(done) {
    request(mercurius.app)
    .post('/notify')
    .send({
      token: 'aToken',
    })
    .expect(500, done);
  });

  it('/getPayload fails with 500', function(done) {
    request(mercurius.app)
    .get('/getPayload/aToken')
    .send()
    .expect(500, done);
  });

  it('/toggleClientNotification fails with 500', function(done) {
    request(mercurius.app)
    .post('/toggleClientNotification')
    .send({
      token: 'aToken',
      machineId: 'aMachine',
      client: 'aClient',
    })
    .expect(500, done);
  });
});
