var mercurius = require('../index.js');
var request = require('supertest');
var nock = require('nock');
var chai = require('chai');
var testUtils = require('./testUtils.js');

var should = chai.should();

describe('mercurius (multiple-machines-)notify', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machineZ', 'https://localhost:50005', 'key'))
    .then(gotToken => token = gotToken)
    .then(() => testUtils.register(mercurius.app, 'machineZ2', 'https://localhost:50006', 'key', token));
  });

  it('sends notifications to multiple machines of a registered user', function(done) {
    nock('https://localhost:50006')
    .post('/')
    .reply(201);

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

  it('returns `500` if there\'s a failure in sending a notifications to one of the machines of a registered user', function(done) {
    nock('https://localhost:50006')
    .post('/')
    .reply(201);

    nock('https://localhost:50005')
    .post('/')
    .reply(404);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
    })
    .expect(500, done);
  });
});
