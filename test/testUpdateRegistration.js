var mercurius = require('../index.js');
var request = require('supertest');
var nock = require('nock');
var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');
var redis = require('../redis.js');
var testUtils = require('./testUtils.js');

var userCurve = crypto.createECDH('prime256v1');

var userPublicKey = userCurve.generateKeys();
var userPrivateKey = userCurve.getPrivateKey();

describe('mercurius updateRegistration', function() {
  var token;

  before(function() {
    return mercurius.ready
    .then(() => testUtils.register(mercurius.app, 'machine_1', 'https://localhost:50005', urlBase64.encode(userPublicKey), token))
    .then(gotToken => token = gotToken)
    .then(() => testUtils.register(mercurius.app, 'machine_2', 'https://localhost:50006', urlBase64.encode(userPublicKey)));
  });

  it('updates the registration successfully on `updateRegistration`', function(done) {
    nock('https://localhost:50007')
    .post('/')
    .reply(201);

    request(mercurius.app)
    .post('/updateRegistration')
    .send({
      token: token,
      machineId: 'machine_1',
      endpoint: 'https://localhost:50007',
      key: urlBase64.encode(userPublicKey),
    })
    .expect(200, function() {
      request(mercurius.app)
      .post('/notify')
      .send({
        token: token,
      })
      .expect(200, done);
    });
  });

  it('replies with 404 on `updateRegistration` when a registration doesn\'t exist', function(done) {
    request(mercurius.app)
    .post('/updateRegistration')
    .send({
      token: 'token_inesistente',
      machineId: 'machine_1',
      endpoint: 'endpoint',
      key: urlBase64.encode(userPublicKey),
    })
    .expect(404, done);
  });

  it('replies with 404 on `updateRegistration` when a registration doesn\'t exist', function(done) {
    redis.sadd(token, 'nonexistingmachine')
    .then(function() {
      request(mercurius.app)
      .post('/updateRegistration')
      .send({
        token: token,
        machineId: 'nonexistingmachine',
        endpoint: 'endpoint',
        key: urlBase64.encode(userPublicKey),
      })
      .expect(404, done);
    });
  });

  it('returns 404 on `updateRegistration` if the machine exists but isn\'t in the token set', function(done) {
    request(mercurius.app)
    .post('/updateRegistration')
    .send({
      token: token,
      machineId: 'machine_2',
      endpoint: 'endpoint',
      key: urlBase64.encode(userPublicKey),
      name: 'newName',
    })
    .expect(404, done);
  });
});
