var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');
var testUtils = require('./testUtils.js');

describe('mercurius getPayload', function() {
  var gcmToken;

  before(function() {
    return mercurius.ready
    .then(function() {
      return testUtils.register(mercurius.app, 'machineX', 'https://android.googleapis.com/gcm/send/someSubscriptionID', '')
      .then(token => gcmToken = token);
    })
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
});
