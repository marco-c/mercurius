var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var nock = require('nock');
var crypto = require('crypto');

describe('mercurius register', function() {
  var token;

  before(function() {
    return mercurius.ready;
  });

  var origRandomBytes = crypto.randomBytes;
  afterEach(function() {
    crypto.randomBytes = origRandomBytes;
  });

  it('replies with 500 if there\'s an error while generating the token', function(done) {
    crypto.randomBytes = function(len, cb) {
      cb(new Error('Fake error.'));
    };

    request(mercurius.app)
    .post('/register')
    .send({
      machineId: 'machineX',
      endpoint: 'http://localhost:50005',
      key: '',
    })
    .expect(500, done);
  });
});
