require('dotenv').config();

const { authorize } = require('./quickstart');
const express = require('express');
const moment = require('moment');
const google = require('googleapis');
const bodyParser = require('body-parser');
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

const createCalendarEvent = (auth, event) => {
  const calendar = google.calendar('v3');
  const config = {
    auth: auth,
    calendarId: 's9ctm9dtrlbjefdj6bb9krdrog@group.calendar.google.com',
    resource: event,
    sendNotifications: true,
  };

  return new Promise((resolve, reject) => {
    calendar.events.insert(config, (err, event) => {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      resolve(event);
    });
  })

};

const isFreeInCalendar = (auth, askStart, askEnd) => {
  return new Promise((resolve, reject) => {
    getCalendarEvents(auth).then((events) => {

      const isStartInEvent = !!events.find((event) => {
        const eventStart = moment(event.start.dateTime);
        const eventEnd = moment(event.end.dateTime);

        return askStart.isBefore(eventEnd) && askStart.isAfter(eventStart);
      });
      const isEndInEvent = !!events.find((event) => {
        const eventStart = moment(event.start.dateTime);
        const eventEnd = moment(event.end.dateTime);

        return askEnd.isBefore(eventEnd) && askEnd.isAfter(eventStart);
      });

      const hasOverlappingEvent = events.find((event) => {
        const eventStart = moment(event.start.dateTime);
        const eventEnd = moment(event.end.dateTime);

        return eventStart.isAfter(askStart) && eventEnd.isBefore(askEnd);
      });
      console.log('TEST', isStartInEvent, isEndInEvent, hasOverlappingEvent);

      const isFree = !isEndInEvent && !isStartInEvent && !hasOverlappingEvent;
      resolve(isFree);
    })
  });
};

app.get('/free', (req, res) => {
  const bookFree = (auth) => {
    isFreeInCalendar(auth, moment('2017-11-24T16:00:00+01:00'), moment('2017-11-24T16:45:00+01:00'))
      .then((isFree) => {
        res.send(isFree);
      })
  };
  authorize(bookFree);
});

app.get('/list', function (req, res) {
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

app.get('/create', (req, res) => {
  const createEvent = (auth) => {
    const title = 'HAHA';
    const start = {
      dateTime: '2017-11-24T17:30:00+01:00',
      timeZone: 'Europe/Berlin'
    };
    const end = {
      dateTime: '2017-11-24T18:30:00+01:00',
      timeZone: 'Europe/Berlin'
    };
    const event = {
      summary: title,
      start,
      end,
    };

    createCalendarEvent(auth, event).then((newEvent) => {
      res.send(newEvent);
    });
  };
  authorize(createEvent);
});

app.use(bodyParser.json());

app.post('/dialogflow', (req, res) => {
  res.header('Content-type', 'application/json');
  console.log('TRIGGERED', req.body);
  const { action, parameters, contexts } = req.body.result;

  switch (action) {
    case 'checkBook':
      const { duration, from } = parameters;
      if (from) {
        console.log(from);
        const start = moment(from, [moment.ISO_8601, 'HH:mm:ss']);
        const end = start.clone().add(duration.amount, duration.unit);
        const handleCheck = (auth) => {
          isFreeInCalendar(auth, start, end)
            .then((isFree) => {
              let followUpEvent = '';
              if (isFree) {
                followUpEvent = 'BOOK_AVAILABLE';
              } else {
                followUpEvent = 'BOOK_UNAVAILABLE';
              }
              res.send(
                {
                  'followupEvent': {
                    'name': followUpEvent,
                    'data': {
                      'startTime': start.format('HH:mm'),
                      'endTime': end.format('HH:mm'),
                    }
                  }
                }
              );
            })
        };

        authorize(handleCheck);
      }
      break;
    case 'Book.Book-custom.Book-AVAILABLE-yes': {
      const { parameters: { startTime, endTime, participants, 'participants.original': names } } = contexts.find((context) => context.name === 'book-followup');
      console.log(contexts);
      console.log('TEST', participants, names);
      const createMeeting = (auth) => {
        const event = {
          summary: `Meeting with ${names}`,
          start: {
            dateTime: moment(startTime, 'HH:mm').format(),
          },
          end: {
            dateTime: moment(endTime, 'HH:mm').format(),
          },
          attendees: participants.map((participant) => ({ email: participant }))
        };
        createCalendarEvent(auth, event).then(() => {
          res.send({
            'followupEvent': {
              'name': 'ROOM_BOOKED',
              'data': {
                startTime,
                endTime,
                title: event.summary,
              }
            }
          });
        });
      };
      authorize(createMeeting);
      break;
    }
    default:
      break;
  }
});

app.listen(3000, () => {
  console.log('Express started on port 3000');
});

