var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');

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
          token = res.text;
        })
        .end(done);
    });
  });

  it('sends notifications to multiple machines of a registered user', function(done) {
    nock('https://localhost:50006')
    .post('/')
    .reply(201);

    nock('https://localhost:50005')
    .post('/')
    .reply(201);

    request(mercurius.app)
      .post('/register')
      .send({
        token: token,
        machineId: 'machine2',
        endpoint: 'https://localhost:50006',
        key: 'key',
      })
      .expect(200, function(res) {
        request(mercurius.app)
        .post('/notify')
        .send({
          token: token,
        })
        .expect(200, done);
      });
  });
});
