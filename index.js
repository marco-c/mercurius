var express = require('express');
var app = express();

var port = process.env.PORT || 3003;
var ready = new Promise(function(resolve, reject) {
  app.listen(port, function(err) {
    if (err) {
      reject(err);
      return;
    }
    console.log('app.listen on http://localhost:%d', port);
    resolve();
  });
});
