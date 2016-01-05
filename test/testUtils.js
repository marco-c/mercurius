var request = require('supertest');
var nock = require('nock');
var assert = require('assert');
var redis = require('../redis.js');

afterEach(function() {
  assert(nock.isDone(), 'All requests have been made. Pending: ' + nock.pendingMocks());
});

before(function() {
  return redis.select(5);
});

after(function() {
  return redis.flushdb();
});

module.exports = {
  register: function(app, machine, endpoint, key, existingToken, doNotify) {
    return new Promise(function(resolve, reject) {
      var token;

      request(app)
      .post('/register')
      .send({
        token: existingToken,
        machineId: machine,
        endpoint: endpoint,
        key: key,
      })
      .expect(function(res) {
        token = res.body.token;
      })
      .end(function() {
        if (!doNotify) {
          resolve(token);
          return;
        }

        return request(app)
        .post('/notify')
        .send({
          token: token,
          client: 'test',
        })
        .end(function() {
          resolve(token);
        });
      });
    });
  },
};
