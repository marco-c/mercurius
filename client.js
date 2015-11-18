#! /usr/bin/env node

const packageJson = require('./package.json');
const program     = require('commander');
const https       = require('https');
const fs          = require('fs');
const url         = require('url');
const http        = require('http');

program.version(packageJson.version);

// Example usage:
// ./client.js notify http://localhost:4000 a81123751fa9219ce873aa403c9d458dd32eb4cb991350324e004a06b9c87461 '{"title":"A nice title.","body":"A nice body."}'
program.command('notify [mercuriusURL] [token] [payload]')
       .description('send a notification')
       .action(function(mercuriusURL, token, payload) {
  var payload = JSON.stringify({
    token: token,
    payload: JSON.parse(payload),
    ttl: 200,
  });

  var urlParts = url.parse(url.resolve(mercuriusURL, 'notify'));
  var options = {
    hostname: urlParts.hostname,
    port: urlParts.port,
    path: urlParts.pathname,
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
     'Content-Length': payload.length,
    }
  };

  var request = http.request(options, function(response) {
    console.log('Response statusCode: ' + response.statusCode);
  });

  request.write(payload);
  request.end();
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
