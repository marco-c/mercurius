var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');
var testUtils = require('./testUtils.js');

describe('mercurius clients support', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machineXZ', 'https://localhost:50005', ''))
    .then(gotToken => token = gotToken);
  });

  it('sends notifications to a machine from a client', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
      client: 'clientXZ'
    })
    .expect(200, done);
  });

  it('provides information about the client', function(done) {
    request(mercurius.app)
    .get('/devices/' + token)
    .send()
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.equal(res.body.clients.length, 1);
      assert.equal(res.body.clients.indexOf('clientXZ'), 0);
      assert.equal(res.body.machines.machineXZ.clients.clientXZ, '1');
    })
    .end(done);
  });
});
