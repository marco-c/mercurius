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

describe('mercurius getPayload', function() {
  var gcmToken, webPushToken;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machineX', 'https://android.googleapis.com/gcm/send/someSubscriptionID', ''))
    .then(token => gcmToken = token)
    .then(() => testUtils.register(mercurius.app, 'machineZ', 'https://localhost:50005', urlBase64.encode(userPublicKey)))
    .then(token => webPushToken = token);
  });

  it('replies with 404 if there\'s no payload available', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + gcmToken)
    .send()
    .expect(404, done);
  });

  it('successfully sends a notification to a GCM endpoint', function(done) {
    nock('https://android.googleapis.com/')
    .post('/gcm/send')
    .reply(200);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: gcmToken,
      payload: 'hello',
    })
    .expect(200, done);
  });

  it('replies with the payload encoded in JSON if there\'s a payload available', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + gcmToken)
    .send()
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.equal(res.text, '"hello"');
    })
    .end(done);
  });

  it('replies with the payload encoded in JSON (doesn\'t remove the payload)', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + gcmToken)
    .send()
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.equal(res.text, '"hello"');
    })
    .end(done);
  });

  it('sends a notification with payload to a registered user', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: webPushToken,
      payload: 'hello',
    })
    .expect(200, done);
  });

  it('replies with 404 on `getPayload` for Web Push-capable endpoints', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + webPushToken)
    .send()
    .expect(404, done);
  });
});
