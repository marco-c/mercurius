var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var fs = require('fs');

describe('mercurius', function() {
  var token;

  before(function(done) {
    mercurius.ready.then(function() {
      request(mercurius.app)
      .post('/register')
      .send({
        machineId: 'machineX',
        endpoint: 'http://localhost:50005',
        key: '',
      })
      .expect(function(res) {
        token = res.body.token;
      })
      .end(done);
    });
  });

  it('generates the correct barcode', function(done) {
    request(mercurius.app)
    .get('/generateBarcode/Marco')
    .send()
    .expect(function(res) {
      assert.equal(res.status, 200);
      var expected = fs.readFileSync('test/Marco.png');
      assert(res.body.equals(expected));
    })
    .end(done);
  });
});
