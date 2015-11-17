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
});
