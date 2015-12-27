var mercurius = require('../index.js');
var request = require('supertest');

describe('mercurius', function() {
  before(function() {
    return mercurius.ready;
  });

  it('returns index.html', function(done) {
    request(mercurius.app)
    .get('/')
    .expect(200, done);
  });
});
