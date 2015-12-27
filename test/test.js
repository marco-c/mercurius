var mercurius = require('../index.js');
var request = require('supertest');
var nock = require('nock');
var chai = require('chai');
var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');
var redis = require('../redis');

var assert = chai.assert;
chai.should();

var userCurve = crypto.createECDH('prime256v1');

var userPublicKey = userCurve.generateKeys();
var userPrivateKey = userCurve.getPrivateKey();

describe('mercurius', function() {
  var token;
  var tokenToUnregister;

  before(function(done) {
    mercurius.ready.then(function() {
      request(mercurius.app)
      .post('/register')
      .send({
        machineId: 'machineX',
        endpoint: 'https://localhost:50005',
        key: urlBase64.encode(userPublicKey),
      })
      .expect(function(res) {
        token = res.body.token;
      })
      .end(done);
    });
  });

  it('returns index.html', function(done) {
    request(mercurius.app)
    .get('/')
    .expect(200, done);
  });

  it('successfully registers users', function(done) {
    request(mercurius.app)
    .post('/register')
    .send({
      machineId: 'machine',
      endpoint: 'https://localhost:50008',
      key: urlBase64.encode(userPublicKey),
    })
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.isObject(res.body);
      assert.isObject(res.body.machines);
      assert.equal(res.body.token.length, 16);
      tokenToUnregister = res.body.token;
    })
    .end(done);
  });

  it('successfully registers additional machine', function(done) {
    request(mercurius.app)
    .post('/register')
    .send({
      token: tokenToUnregister,
      machineId: 'machine2',
      endpoint: 'endpoint',
      key: urlBase64.encode(userPublicKey),
    })
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.equal(res.body.token, tokenToUnregister);
      assert.equal(res.body.machines.machine.endpoint, 'https://localhost:50008');
      assert.equal(res.body.machines.machine2.endpoint, 'endpoint');
    })
    .end(done);
  });

  it('successfully registers a machine even if it exists', function(done) {
    redis.smembers(tokenToUnregister)
    .then(function(machines) {
      var startlength = machines.length;
      request(mercurius.app)
      .post('/register')
      .send({
        token: tokenToUnregister,
        machineId: 'machine2',
        endpoint: 'endpoint2',
        key: urlBase64.encode(userPublicKey),
      })
      .expect(function(res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.token, tokenToUnregister);
        assert.equal(res.body.machines.machine2.endpoint, 'endpoint2');
        assert.equal(Object.keys(res.body.machines).length, startlength);
      })
      .end(done);
    });
  });

  it('returns 404 if bad token provided', function(done) {
    request(mercurius.app)
    .post('/register')
    .send({
      token: 'notexisting',
      machineId: 'machine of a not existing token',
      endpoint: 'endpoint',
      key: urlBase64.encode(userPublicKey),
    })
    .expect(404, done);
  });

  it('replies with 404 on `notify` when a registration doesn\'t exist', function(done) {
    request(mercurius.app)
    .post('/notify')
    .send({
      token: 'token_inesistente',
    })
    .expect(404, done);
  });

  it('replies with 500 on `notify` when there\'s an error with the push service', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(404);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
    })
    .expect(500, done);
  });

  it('sends a notification to a registered user', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
    })
    .expect(200, done);
  });

  it('sends a notification with payload to a registered user', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
      payload: 'hello',
    })
    .expect(200, done);
  });
});
