# mercurius
Cross-platform web push center. Site allows to proxy a POST request to a full featured push notification. Especially useful for services without web presence, originally came out as an IRSSI notification system.

Secure, as no data is stored except of generated token, machine id with an endpoint and connected client names.

Check [![the post on Mozilla's hacks page](https://hacks.mozilla.org/2015/12/web-push-notifications-from-irssi/) to see a real live usecase.

[![Build Status](https://travis-ci.org/marco-c/mercurius.svg?branch=master)](https://travis-ci.org/marco-c/mercurius)
[![dependencies](https://david-dm.org/marco-c/mercurius.svg)](https://david-dm.org/marco-c/mercurius)
[![devdependencies](https://david-dm.org/marco-c/mercurius/dev-status.svg)](https://david-dm.org/marco-c/mercurius#info=devDependencies)

## API

### POST /notify
Send a notification to a user.

The body of the request is a JSON object containing:
 - token;
 - client - the client sending the notification (e.g. 'Irssi');
 - payload;
 - *(optional)* TTL (Time-To-Live of the notification).

The payload is a JSON object containing the parameters of the nofication to be shown to the user:
 - title: the title of the notification;
 - body: the body of the notification.

Example:
```
{
    "token": "aToken",
    "client": "someClient",
    "payload": {
        "title": "IRSSI",
        "body": "a message"
    }
}
```

## INSTALL

Install Redis database and set `REDISCLOUD_URL` environment variable to its 
host (`redis://localhost:6379`)
