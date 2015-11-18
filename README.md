# mercurius
Generic push server

## API

### POST /notify
Send notification to a user.
The body of the request is a JSON object containing:
 - token;
 - payload;
 - *(optional)* TTL (Time-To-Live of the notification).

The payload is a JSON object containing the parameters of the nofication to be shown to the user:
 - title: the title of the notification;
 - body: the body of the notification.
