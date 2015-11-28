# mercurius
Generic Web Push server

[![Build Status](https://travis-ci.org/marco-c/mercurius.svg?branch=master)](https://travis-ci.org/marco-c/mercurius)
[![dependencies](https://david-dm.org/marco-c/mercurius.svg)](https://david-dm.org/marco-c/mercurius)
[![devdependencies](https://david-dm.org/marco-c/mercurius/dev-status.svg)](https://david-dm.org/marco-c/mercurius#info=devDependencies)

## API

### POST /notify
Send a notification to a user.

The body of the request is a JSON object containing:
 - token;
 - payload;
 - *(optional)* TTL (Time-To-Live of the notification).

The payload is a JSON object containing the parameters of the nofication to be shown to the user:
 - title: the title of the notification;
 - body: the body of the notification.

Example:
```
{
    "token": "aToken",
    "payload": {
        "title": "IRSSI",
        "body": "a message"
    }
}
```

## INSTALL

Install Redis database and set `REDISCLOUD_URL` environment variable to its 
host (`redis://localhost:6379`)
