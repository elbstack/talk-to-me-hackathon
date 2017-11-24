require('dotenv').config();

const { authorize } = require('./quickstart');
const express = require('express');
const moment = require('moment');
const google = require('googleapis');
const app = express();

const getCalendarEvents = (auth, timeMin, timeMax) => {
  const calendar = google.calendar('v3');
  const config = {
    auth: auth,
    calendarId: 's9ctm9dtrlbjefdj6bb9krdrog@group.calendar.google.com',
    // maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  };
  config.timeMin = timeMin ? timeMin : (new Date()).toISOString();
  if (timeMax) {
    config.timeMax = timeMax;
  }

  return new Promise((resolve, reject) => {
    calendar.events.list(config, function (err, response) {
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

