var mercurius = require('../index.js');
var request = require('supertest');
var nock = require('nock');
var chai = require('chai');
var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');
var redis = require('redis');

var assert = chai.assert;
chai.should();

var client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

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
    client.smembers(tokenToUnregister, function(err, machines) {
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


  it('successfully returnes all machines assigned to a token', function(done) {
      request(mercurius.app)
        .get('/devices/' + tokenToUnregister)
        .send()
        .expect(function(res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body);
          assert.equal(res.body.token, tokenToUnregister);
          assert.isObject(res.body.machines);
          assert.equal(res.body.machines.machine.endpoint, 'https://localhost:50008');
          assert.equal(res.body.machines.machine2.endpoint, 'endpoint2');
        })
        .end(done);
  });

  it('returns 404 if requesting machines assigned to a non-existing token', function(done) {
      request(mercurius.app)
        .get('/devices/nonexisting')
        .send()
        .expect(404, done);
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

  it('successfully unregisters a machine', function(done) {
    nock('https://localhost:50008')
    .post('/')
    .reply(201);

    request(mercurius.app)
      .post('/unregisterMachine')
      .send({
        token: tokenToUnregister,
        machineId: 'machine',
      })
      .expect(200, done);
  });

  it('replies with 404 when trying to unregister a non existing token', function(done) {
    request(mercurius.app)
      .post('/unregisterMachine')
      .send({
        token: 'nonexistingtoken',
        machineId: 'machine',
      })
      .expect(404, done);
  });

  it('replies with 404 when trying to unregister a non registered machine', function(done) {
    request(mercurius.app)
      .post('/unregisterMachine')
      .send({
        token: tokenToUnregister,
        machineId: 'non-existing-machine',
      })
      .expect(404, done);
  });

  it('successfully unregisters users', function(done) {
    request(mercurius.app)
      .post('/unregister')
      .send({
        token: tokenToUnregister,
      })
      .expect(200, done);
  });

  it('replies with 404 when trying to unregister a non registered user', function(done) {
    request(mercurius.app)
      .post('/unregister')
      .send({
        token: tokenToUnregister,
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

  it('replies with 404 on `getPayload` for Web Push-capable endpoints', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + token)
    .send()
    .expect(404, done);
  });

  it('updates the registration successfully on `updateRegistration`', function(done) {
    nock('https://localhost:50007')
    .post('/')
    .reply(201);

    request(mercurius.app)
      .post('/updateRegistration')
      .send({
        token: token,
        machineId: 'machineX',
        endpoint: 'https://localhost:50007',
        key: urlBase64.encode(userPublicKey),
      })
      .expect(200, function() {
        request(mercurius.app)
          .post('/notify')
          .send({
            token: token,
          })
          .expect(200, done);
      });
  });

  it('replies with 404 on `updateRegistration` when a registration doesn\'t exist', function(done) {
    request(mercurius.app)
      .post('/updateRegistration')
      .send({
        token: 'token_inesistente',
        machineId: 'machineX',
        endpoint: 'endpoint',
        key: urlBase64.encode(userPublicKey),
      })
      .expect(404, done);
  });

  it('replies with 404 on `updateRegistration` when a registration doesn\'t exist', function(done) {
    client.sadd(token, 'nonexistingmachine', function() {
      request(mercurius.app)
        .post('/updateRegistration')
        .send({
          token: token,
          machineId: 'nonexistingmachine',
          endpoint: 'endpoint',
          key: urlBase64.encode(userPublicKey),
        })
        .expect(404, done);
    });
  });

  it('returns 404 on `updateRegistration` if the machine exists but isn\'t in the token set', function(done) {
    request(mercurius.app)
    .post('/register')
    .send({
      machineId: 'machine_3',
      endpoint: 'https://localhost:50005',
      key: 'key',
    })
    .end(function() {
      request(mercurius.app)
      .post('/updateRegistration')
      .send({
        token: token,
        machineId: 'machine_3',
        endpoint: 'endpoint',
        key: urlBase64.encode(userPublicKey),
        name: 'newName',
      })
      .expect(404, done);
    });
  });

  it('replies with 404 on `getPayload` if there\'s no payload available (because endpoint is not GCM)', function(done) {
    request(mercurius.app)
      .get('/getPayload')
      .send({
        token: token,
      })
      .expect(404, done);
  });
});
