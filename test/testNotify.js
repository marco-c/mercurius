var mercurius = require('../index.js');
var request = require('supertest');
var nock = require('nock');
var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');
var testUtils = require('./testUtils.js');

var userCurve = crypto.createECDH('prime256v1');

var userPublicKey = userCurve.generateKeys();
var userPrivateKey = userCurve.getPrivateKey();

describe('mercurius notify', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine_1', 'https://localhost:50005', urlBase64.encode(userPublicKey)))
    .then(gotToken => token = gotToken);
  });

  it('replies with 404 on `notify` when a registration doesn\'t exist', function(done) {
    request(mercurius.app)
    .post('/notify')
    .send({
      token: 'token_inesistente',
      client: 'test',
    })
    .expect(404, done);
  });

  it('replies with 500 on `notify` when there\'s an error with the push service', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(404);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
      client: 'test',
    })
    .expect(500, done);
  });

  it('sends a notification to a registered user', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
      client: 'test',
    })
    .expect(200, done);
  });

  it('sends a notification with payload to a registered user', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/notify')
    .send({
      token: token,
      client: 'test',
      payload: 'hello',
    })
    .expect(200, done);
  });
});
