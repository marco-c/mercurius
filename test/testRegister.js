var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('chai').assert;
var nock = require('nock');
var crypto = require('crypto');
var redis = require('../redis.js');

describe('mercurius register', function() {
  var token;

  before(function() {
    return mercurius.ready;
  });

  var origRandomBytes = crypto.randomBytes;
  afterEach(function() {
    crypto.randomBytes = origRandomBytes;
  });

  it('replies with 500 if there\'s an error while generating the token', function(done) {
    crypto.randomBytes = function(len, cb) {
      cb(new Error('Fake error.'));
    };

    request(mercurius.app)
    .post('/register')
    .send({
      machineId: 'machineX',
      endpoint: 'http://localhost:50005',
      key: '',
    })
    .expect(500, done);
  });

  it('successfully registers users', function(done) {
    request(mercurius.app)
    .post('/register')
    .send({
      machineId: 'machine',
      endpoint: 'https://localhost:50008',
      key: '',
    })
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.isObject(res.body);
      assert.isObject(res.body.machines);
      assert.equal(res.body.token.length, 16);
      token = res.body.token;
    })
    .end(done);
  });

  it('successfully registers additional machine', function(done) {
    request(mercurius.app)
    .post('/register')
    .send({
      token: token,
      machineId: 'machine2',
      endpoint: 'endpoint',
      key: '',
    })
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.equal(res.body.token, token);
      assert.equal(res.body.machines.machine.endpoint, 'https://localhost:50008');
      assert.equal(res.body.machines.machine2.endpoint, 'endpoint');
    })
    .end(done);
  });

  it('successfully registers a machine even if it exists', function(done) {
    redis.smembers(token)
    .then(function(machines) {
      var startlength = machines.length;
      request(mercurius.app)
      .post('/register')
      .send({
        token: token,
        machineId: 'machine2',
        endpoint: 'endpoint2',
        key: '',
      })
      .expect(function(res) {
        assert.equal(res.status, 200);
        assert.equal(res.body.token, token);
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
      key: '',
    })
    .expect(404, done);
  });
});
