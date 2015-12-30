var mercurius = require('../index.js');
var request = require('supertest');
var testUtils = require('./testUtils.js');
var redis = require('../redis.js');
var chai = require('chai');

var should = chai.should();

describe('mercurius unregister', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine_1', 'https://android.googleapis.com/gcm/send/someSubscriptionID', ''))
    .then(gotToken => token = gotToken);
  });

  it('returns 404 if bad token provided', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: 'notexisting',
    })
    .expect(404, done);
  });

  it('successfully unregisters users', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: token,
    })
    .expect(200, done);
  });

  it('replies with 404 when trying to unregister a non registered user', function(done) {
    request(mercurius.app)
    .post('/unregister')
    .send({
      token: token,
    })
    .expect(404, done);
  });

  it('replies with 404 on `notify` after a registration has been removed', function(done) {
    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
    })
    .expect(404, done);
  });

  it('deletes all token related data after a registration has been removed', function(done) {
    redis.exists(token)
    .then(function(exists) {
      exists.should.equal(0);
      console.log('ZZZ: checking ' + token);
      return redis.exists(token + ':clients');
    })
    .catch(done)
    .then(function(exists) {
      exists.should.equal(0);
      return redis.exists('machine_1');
    })
    .catch(done)
    .then(function(exists) {
      exists.should.equal(0);
      return redis.exists('machine_1:clients');
    })
    .catch(done)
    .then(function(exists) {
      exists.should.equal(0);
      done();
    })
    .catch(done);
  });
});
