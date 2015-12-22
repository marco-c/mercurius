var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');
var testUtils = require('./testUtils.js');

describe('mercurius unregisterMachine', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine_1', 'https://android.googleapis.com/gcm/send/someSubscriptionID', ''))
    .then(gotToken => token = gotToken)
    .then(() => testUtils.register(mercurius.app, 'machine_2', 'https://localhost:50005', '', token));
  });

  it('replies with 404 on `getPayload` if there\'s no payload available', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + token)
    .send()
    .expect(404, done);
  });

  it('successfully unregisters a GCM endpoint', function(done) {
    nock('https://android.googleapis.com/')
    .post('/gcm/send')
    .reply(200);

    request(mercurius.app)
    .post('/unregisterMachine')
    .send({
      token: token,
      machineId: 'machine_1',
    })
    .expect(200, done);
  });

  it('replies with the payload encoded in JSON on `getPayload` if there\'s a payload available', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + token)
    .send()
    .expect(function(res) {
      assert.equal(res.status, 200);
      var obj = JSON.parse(res.text);
      assert.equal(obj.title, 'unregister');
      assert.equal(obj.body, 'called from unregisterMachine');
    })
    .end(done);
  });
});
