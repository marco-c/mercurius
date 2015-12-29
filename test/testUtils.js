var request = require('supertest');

module.exports = {
  register: function(app, machine, endpoint, key, existingToken) {
    return new Promise(function(resolve, reject) {
      var token;

      request(app)
      .post('/register')
      .send({
        token: existingToken,
        machineId: machine,
        endpoint: endpoint,
        key: key,
      })
      .expect(function(res) {
        token = res.body.token;
      })
      .end(function() {
        resolve(token);
      });
    });
  },
};
