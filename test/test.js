var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');
var should = require('chai').should();
var redis = require('redis');


var client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

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
          key: 'key',
        })
        .expect(function(res) {
          token = res.text;
        })
        .end(done);
    });
  });

  it('successfully registers users', function(done) {
    request(mercurius.app)
      .post('/register')
      .send({
        machineId: 'machine',
        endpoint: 'endpoint',
        key: 'key',
      })
      .expect(function(res) {
        assert.equal(res.status, 200);
        assert.equal(res.text.length, 64);
        tokenToUnregister = res.text;
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
        key: 'key',
      })
      .expect(function(res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, tokenToUnregister);
      })
      .end(done);
  });

  it('successfully registers a machine even if it exists', function(done) {
    client.smembers(tokenToUnregister, function(err, machines) {
      var startLength = machines.length;
      request(mercurius.app)
        .post('/register')
        .send({
          token: tokenToUnregister,
          machineId: 'machine2',
          endpoint: 'endpoint',
          key: 'key',
        })
        .expect(function(res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, tokenToUnregister);
          client.smembers(tokenToUnregister, function(err, newmachines) {
            assert.equal(newmachines.length, startlength);
          });
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
        key: 'key',
      })
      .expect(404, done);
  });

  it('successfully unregisters machines', function(done) {
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
        key: 'newKey',
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
        key: 'key',
      })
      .expect(404, done);
  });

  it('updates the metadata successfully on `updateMeta`', function(done) {
    nock('https://localhost:50007')
    .post('/')
    .reply(201);

    request(mercurius.app)
      .post('/updateMeta')
      .send({
        token: token,
        machineId: 'machineX',
        name: 'newName',
        active: false,
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
    client.sadd(token, 'nonexistingmachine', function() {
      request(mercurius.app)
        .post('/updateRegistration')
        .send({
          token: token,
          machineId: 'nonexistingmachine',
          endpoint: 'endpoint',
          key: 'key',
        })
        .expect(404, done);
    });
  });
});
