var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');

describe('mercurius', function() {
  var token;
  var tokenToUnregister;

  before(function(done) {
    mercurius.ready.then(function() {
      request(mercurius.app)
        .post('/register')
        .send({
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

  it('replies with 404 on `updateRegistration` when a registration doesn\'t exist', function(done) {
    request(mercurius.app)
      .post('/updateRegistration')
      .send({
        token: 'token_inesistente',
        endpoint: 'endpoint',
        key: 'key',
      })
      .expect(404, done);
  });
});
