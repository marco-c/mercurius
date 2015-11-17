var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');

describe('mercurius', function() {
  before(function() {
    return mercurius.ready;
  });

  it('successfully registers users', function(done) {
    request(mercurius.app)
      .post('/register')
      .send({
        endpoint: 'endpoint',
        key: 'key'
      })
      .expect(function(res) {
        assert.equal(res.status, 200);
        assert.equal(res.text.length, 64);
      })
      .end(done);
  });

  it('sends 404 when a registration doesn\'t exist', function(done) {
    request(mercurius.app)
      .post('/notify')
      .send({
        token: 'token_inesistente',
      })
      .expect(404, done);
  });
});
