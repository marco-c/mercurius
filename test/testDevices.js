var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('chai').assert;
var testUtils = require('./testUtils.js');

describe('mercurius devices', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine1', 'https://localhost:50005', ''))
    .then(gotToken => token = gotToken)
    .then(() => testUtils.register(mercurius.app, 'machine2', 'https://localhost:50006', '', token));
  });

  it('successfully returnes all machines assigned to a token', function(done) {
    request(mercurius.app)
    .get('/devices/' + token)
    .send()
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.isObject(res.body);
      assert.equal(res.body.token, token);
      assert.isObject(res.body.machines);
      assert.equal(res.body.machines.machine1.endpoint, 'https://localhost:50005');
      assert.equal(res.body.machines.machine2.endpoint, 'https://localhost:50006');
    })
    .end(done);
  });

  it('returns 404 if requesting machines assigned to a non-existing token', function(done) {
    request(mercurius.app)
    .get('/devices/nonexisting')
    .send()
    .expect(404, done);
  });
});
