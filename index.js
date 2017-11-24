require('dotenv').config();

const { authorize } = require('./quickstart');
const express = require('express');
const moment = require('moment');
const google = require('googleapis');
const app = express();

const getCalendarEvents = (auth) => {
  const calendar = google.calendar('v3');
  return new Promise((resolve, reject) => {
    calendar.events.list({
      auth: auth,
      calendarId: 's9ctm9dtrlbjefdj6bb9krdrog@group.calendar.google.com',
      timeMin: (new Date()).toISOString(),
      // maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    }, function (err, response) {
      if (err) {
        reject(err);
        console.log('The API returned an error: ' + err);
        return;
      }
      resolve(response.items);
    });
  });
};

app.get('/', function (req, res) {
  const findEvent = (auth) => {
    getCalendarEvents(auth).then((events) => {
      let response = '';
      if (events.length == 0) {
        console.log('No upcoming events found.');
      } else {
        console.log('Upcoming 10 events:');
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const start = event.start.dateTime || event.start.date;
          const end = event.end.dateTime || event.end.date;
          console.log(event);
          console.log('%s - %s', start, end, event.summary);
          response = `${start} - ${end} - ${event.summary}`;
        }
      }
      res.send(response);
    });
  };

  authorize(findEvent);
});

app.listen(3000, () => {
  console.log('Express started on port 3000');
});

