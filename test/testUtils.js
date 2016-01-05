var request = require('supertest');
var nock = require('nock');
var assert = require('assert');
var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');
var redis = require('../redis.js');

var userCurve = crypto.createECDH('prime256v1');

var userPublicKey = userCurve.generateKeys();
var userPrivateKey = userCurve.getPrivateKey();

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
    if (typeof key === "undefined" || key === null) {
      key = urlBase64.encode(userPublicKey);
    }

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
          payload: 'hello',
        })
        .end(function() {
          resolve(token);
        });
      });
    });
  },
};
