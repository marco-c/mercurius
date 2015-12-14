var mercurius = require('../index.js');
var request = require('supertest');
var assert = require('assert');
var fs = require('fs');
var bwipjs = require('bwip-js');

describe('mercurius generateBarcode', function() {
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

  var origToBuffer = bwipjs.toBuffer;
  afterEach(function() {
    bwipjs.toBuffer = origToBuffer;
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

  it('returns 500 when failing to generate the barcode', function(done) {
    bwipjs.toBuffer = function(obj, cb) {
      cb(new Error('Fake error.'));
    };

    request(mercurius.app)
    .get('/generateBarcode/Marco')
    .send()
    .expect(500, done);
  });
});
