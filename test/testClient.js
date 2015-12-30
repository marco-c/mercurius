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

  it('toggle (disable) notifications for a client', function(done) {
    request(mercurius.app)
    .post('/toggleClientNotification')
    .send({
      token: token,
      machineId: 'machineXZ',
      client: 'clientXZ',
    })
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.equal(res.body.clients.length, 1);
      assert.equal(res.body.clients.indexOf('clientXZ'), 0);
      assert.equal(res.body.machines.machineXZ.clients.clientXZ, '0');
    })
    .end(done);
  });

  it('doesn\'t send notifications to a machine from a disabled client', function(done) {
    var req = nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
      client: 'clientXZ'
    })
    .expect(200, function() {
      assert(!req.isDone(), 'Notification isn\'t sent do a disabled client');
      nock.cleanAll();
      done();
    });
  });

  it('toggle (enable) notifications for a client', function(done) {
    request(mercurius.app)
    .post('/toggleClientNotification')
    .send({
      token: token,
      machineId: 'machineXZ',
      client: 'clientXZ',
    })
    .expect(function(res) {
      assert.equal(res.status, 200);
      assert.equal(res.body.clients.length, 1);
      assert.equal(res.body.clients.indexOf('clientXZ'), 0);
      assert.equal(res.body.machines.machineXZ.clients.clientXZ, '1');
    })
    .end(done);
  });

  it('sends notifications to a machine from a re-enabled client', function(done) {
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

  it('toggle notifications for a client of a non-existing token', function(done) {
    request(mercurius.app)
    .post('/toggleClientNotification')
    .send({
      token: 'notexisting',
      machineId: 'machineXZ',
      client: 'clientXZ',
    })
    .expect(404, done);
  });
});
