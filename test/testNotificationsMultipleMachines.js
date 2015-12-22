var mercurius = require('../index.js');
var request = require('supertest');
var nock = require('nock');
var chai = require('chai');

chai.should();

describe('mercurius (multiple-machines-)notify', function() {
  var token;

  before(function(done) {
    mercurius.ready.then(function() {
      request(mercurius.app)
      .post('/register')
      .send({
        machineId: 'machineZ',
        endpoint: 'https://localhost:50005',
        key: 'key',
      })
      .expect(function(res) {
        token = res.body.token;
      })
      .end(done);
    });
  });

  it('sends notifications to multiple machines of a registered user', function(done) {
    var count = 0;
    function countReplies() {
      count++;
      return [201, 'boo'];
    }
    nock('https://localhost:50006')
    .post('/')
    .reply(countReplies);

    nock('https://localhost:50005')
    .post('/')
    .reply(countReplies);

    var agent = request(mercurius.app);
    agent.post('/register')
    .send({
      token: token,
      machineId: 'machineZ2',
      endpoint: 'https://localhost:50006',
      key: 'key',
    })
    .end(function(res) {
      agent.post('/notify')
      .send({
        token: token,
      })
      .expect(200)
      .end(function(err, res) {
        console.log(err, res);
        count.should.equal(2);
        done();
      });
    });
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
