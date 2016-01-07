var mercurius = require('../index.js');
var request = require('supertest');
var nock = require('nock');
var testUtils = require('./testUtils.js');
var redis = require('../redis.js');
var chai = require('chai');

chai.should();
var assert = require('chai').assert;

describe('mercurius unregisterMachine', function() {
  var token;

  before(function() {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    nock('https://android.googleapis.com/')
    .post('/gcm/send')
    .reply(200);

    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine_1', 'https://android.googleapis.com/gcm/send/someSubscriptionID', ''))
    .then(gotToken => token = gotToken)
    .then(() => testUtils.register(mercurius.app, 'machine_2', 'https://localhost:50005', null, token, true));
  });

  it('created the machines properly', function() {
    return redis.exists(token)
    .then(function(exists) {
      exists.should.equal(1);
      return redis.exists(token + ':clients');
    })
    .then(function(exists) {
      exists.should.equal(1);
      return redis.exists('machine_2:clients');
    })
    .then(function(exists) {
      exists.should.equal(1);
    });
  });

  it('replies with 404 when trying to unregister a non existing token', function(done) {
    request(mercurius.app)
    .post('/unregisterMachine')
    .send({
      token: 'nonexistingtoken',
      machineId: 'machine',
    })
    .expect(404, done);
  });

  it('replies with 404 when trying to unregister a non registered machine', function(done) {
    request(mercurius.app)
    .post('/unregisterMachine')
    .send({
      token: token,
      machineId: 'non-existing-machine',
    })
    .expect(404, done);
  });

  it('unregisterMachine with an unexisting token/machine doesn\'t affect `getPayload`', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + token)
    .send()
    .expect(200)
    .expect('"hello"')
    .end(done);
  });

  it('successfully unregisters a GCM endpoint', function(done) {
    nock('https://android.googleapis.com/')
    .post('/gcm/send')
    .reply(200);

    request(mercurius.app)
    .post('/unregisterMachine')
    .send({
      token: token,
      machineId: 'machine_1',
    })
    .expect(200, done);
  });

  it('doesn\'t send notifications to unregistered machines but sends them to machines of the same token set of an unregistered machine', function(done) {
    var req1 = nock('https://android.googleapis.com/')
    .post('/gcm/send')
    .reply(200);

    var req2 = nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
      client: 'aClient',
      payload: 'hello',
    })
    .expect(200, function() {
      assert(!req1.isDone(), 'Notification isn\'t sent do an unregistered machine');
      assert(req2.isDone(), 'Notification is sent do a machine in the same token set of an unregistered machine');
      nock.cleanAll();
      done();
    });
  });

  it('replies with the payload encoded in JSON on `getPayload` if there\'s a payload available', function(done) {
    request(mercurius.app)
    .get('/getPayload/' + token)
    .send()
    .expect(200)
    .expect(JSON.stringify({
      title: 'unregister',
      body: 'called from unregisterMachine'
    }))
    .end(done);
  });

  it('hasn\'t deleted a token after unregistering the first machine', function() {
    return redis.exists(token)
    .then(function(exists) {
      exists.should.equal(1);
    });
  });

  it('successfully unregisters a machine', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/unregisterMachine')
    .send({
      token: token,
      machineId: 'machine_2',
    })
    .expect(200, done);
  });

  it('deletes machine\'s clients object after removing the machine', function() {
    return redis.exists('machine_1:clients')
    .then(function(exists) {
      exists.should.equal(0);
    });
  });

  it('deletes token after unregistering the last machine', function() {
    return redis.exists(token)
    .then(function(exists) {
      exists.should.equal(0);
      return redis.exists(token + ':clients');
    })
    .then(function(exists) {
      exists.should.equal(0);
    });
  });
});
