var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');
var redis = require('../redis.js');

describe('mercurius', function() {
  var token;

  before(function(done) {
    mercurius.ready.then(function() {
      request(mercurius.app)
        .post('/register')
        .send({
          machineId: 'machineX',
          endpoint: 'https://localhost:50005',
          key: 'key',
        })
        .expect(function(res) {
          token = res.body.token;
        })
        .end(done);
    });
  });

  it('updates the metadata successfully on `updateMeta`', function(done) {
    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
      .post('/updateMeta')
      .send({
        token: token,
        machineId: 'machineX',
        name: 'newName',
        active: false,
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

  it('returns 404 on `updateMeta` if the token doesn\'t exist', function(done) {
    request(mercurius.app)
      .post('/updateMeta')
      .send({
        token: 'token_inesistente',
        machineId: 'machineX',
        name: 'newName',
      })
      .expect(404, done);
  });

  it('returns 404 on `updateMeta` if the machine doesn\'t exist', function(done) {
    request(mercurius.app)
      .post('/updateMeta')
      .send({
        token: token,
        machineId: 'machine_inesistente',
        name: 'newName',
      })
      .expect(404, done);
  });

  it('returns 404 on `updateMeta` if the machine is in the token set but doesn\'t exist', function(done) {
    redis.sadd(token, 'machine_inesistente')
    .then(function() {
      request(mercurius.app)
        .post('/updateMeta')
        .send({
          token: token,
          machineId: 'machine_inesistente',
          name: 'newName',
        })
        .expect(404, done);
    });
  });
});
