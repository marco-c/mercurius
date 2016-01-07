var mercurius = require('../index.js');
var request = require('supertest');
var chai = require('chai').should();
var nock = require('nock');
var testUtils = require('./testUtils.js');

describe('mercurius clients support', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machineXZ', 'https://localhost:50005'))
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
      client: 'clientXZ',
      payload: 'hello',
    })
    .expect(200, done);
  });

  it('provides information about the client', function(done) {
    request(mercurius.app)
    .get('/devices/' + token)
    .send()
    .expect(200)
    .expect(function(res) {
      res.body.clients.length.should.equal(1);
      res.body.clients.indexOf('clientXZ').should.equal(0);
      res.body.machines.machineXZ.clients.clientXZ.should.equal('1');
    })
    .end(done);
  });

  it('toggles (disables) notifications for a client', function(done) {
    request(mercurius.app)
    .post('/toggleClientNotification')
    .send({
      token: token,
      machineId: 'machineXZ',
      client: 'clientXZ',
      payload: 'hello',
    })
    .expect(200)
    .expect(function(res) {
      res.body.clients.length.should.equal(1);
      res.body.clients.indexOf('clientXZ').should.equal(0);
      res.body.machines.machineXZ.clients.clientXZ.should.equal('0');
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
      client: 'clientXZ',
      payload: 'hello',
    })
    .expect(200, function() {
      req.isDone().should.equal(false, 'Notification isn\'t sent do a disabled client');
      nock.cleanAll();
      done();
    });
  });

  it('toggles (enables) notifications for a client', function(done) {
    request(mercurius.app)
    .post('/toggleClientNotification')
    .send({
      token: token,
      machineId: 'machineXZ',
      client: 'clientXZ',
    })
    .expect(200)
    .expect(function(res) {
      res.body.clients.length.should.equal(1);
      res.body.clients.indexOf('clientXZ').should.equal(0);
      res.body.machines.machineXZ.clients.clientXZ.should.equal('1');
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
      client: 'clientXZ',
      payload: 'hello',
    })
    .expect(200, done);
  });

  it('fails to toggle notifications for a client of a non-existing token', function(done) {
    request(mercurius.app)
    .post('/toggleClientNotification')
    .send({
      token: 'notexisting',
      machineId: 'machineXZ',
      client: 'clientXZ',
    })
    .expect(404, done);
  });

  it('fails to toggle notifications for a client of an unregistered token', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: token,
    })
    .expect(200, function() {
      request(mercurius.app)
      .post('/toggleClientNotification')
      .send({
        token: token,
        machineId: 'machineXZ',
        client: 'clientXZ',
      })
      .expect(404, done);
    });
  });
});
