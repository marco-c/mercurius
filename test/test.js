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
      })
      .end(done);
  });

  it('sends 404 on `notify` when a registration doesn\'t exist', function(done) {
    request(mercurius.app)
      .post('/notify')
      .send({
        token: 'token_inesistente',
      })
      .expect(404, done);
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

  it('sends 404 on `updateRegistration` when a registration doesn\'t exist', function(done) {
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
