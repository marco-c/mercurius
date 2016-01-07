var mercurius = require('../index.js');
var request = require('supertest');
var crypto = require('crypto');
var should = require('chai').should();
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
    .expect(200)
    .expect(function(res) {
      res.body.should.be.an('object');
      res.body.machines.should.be.an('object');
      res.body.token.should.have.length(16);
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
    .expect(200)
    .expect(function(res) {
      res.body.token.should.equal(token);
      res.body.machines.machine.endpoint.should.equal('https://localhost:50008');
      res.body.machines.machine2.endpoint.should.equal('endpoint');
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
      .expect(200)
      .expect(function(res) {
        res.body.token.should.equal(token);
        res.body.machines.machine2.endpoint.should.equal('endpoint2');
        Object.keys(res.body.machines).should.have.length(startlength);
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
