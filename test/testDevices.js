var mercurius = require('../index.js');
var request = require('supertest');
var chai = require('chai');
var testUtils = require('./testUtils.js');

chai.should();

describe('mercurius devices', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine1', 'https://localhost:50005'))
    .then(gotToken => token = gotToken)
    .then(() => testUtils.register(mercurius.app, 'machine2', 'https://localhost:50006', null, token));
  });

  it('successfully returnes all machines assigned to a token', function(done) {
    request(mercurius.app)
    .get('/devices/' + token)
    .send()
    .expect(200)
    .expect(function(res) {
      res.body.should.be.an('object');
      res.body.token.should.equal(token);
      res.body.machines.should.be.an('object');
      res.body.machines.machine1.endpoint.should.equal('https://localhost:50005');
      res.body.machines.machine2.endpoint.should.equal('https://localhost:50006');
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
