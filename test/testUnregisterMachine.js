var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');

describe('mercurius', function() {
  var token;

  before(function(done) {
    mercurius.ready.then(function() {
      request(mercurius.app)
      .post('/register')
      .send({
        machineId: 'machine_1',
        endpoint: 'https://android.googleapis.com/gcm/send/someSubscriptionID',
        key: '',
      })
      .expect(function(res) {
        token = res.body.token;
      })
      .end(function() {
        request(mercurius.app)
        .post('/register')
        .send({
          token: token,
          machineId: 'machine_2',
          endpoint: 'http://localhost:50005',
          key: '',
        })
        .end(done);
      });
    });
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
