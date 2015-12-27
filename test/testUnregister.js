var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');
var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');
var testUtils = require('./testUtils.js');

var userCurve = crypto.createECDH('prime256v1');

var userPublicKey = userCurve.generateKeys();
var userPrivateKey = userCurve.getPrivateKey();

describe('mercurius unregister', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine_1', 'https://android.googleapis.com/gcm/send/someSubscriptionID', ''))
    .then(gotToken => token = gotToken);
  });

  it('returns 404 if bad token provided', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: 'notexisting',
      machineId: 'machine of a not existing token',
      endpoint: 'endpoint',
      key: urlBase64.encode(userPublicKey),
    })
    .expect(404, done);
  });

  it('successfully unregisters users', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: token,
    })
    .expect(200, done);
  });

  it('replies with 404 when trying to unregister a non registered user', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: token,
    })
    .expect(404, done);
  });
});
