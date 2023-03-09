//existing
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

//1-Updated: connect to database
const mongoose = require('mongoose');

//existing
app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
//existing
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
//1-database connection
mongoose.connect(process.env['MONGO_URI'], { useNewUrlParser: true, useUnifiedTopology: true });
//1-Updated-define schemas- storing data for users
let exerciseSessionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String //can use date but not required
})
let userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exerciseSessionSchema]
})
//1-Updated-Creating the Models
let Session = mongoose.model('Session', exerciseSessionSchema)
let User = mongoose.model('User', userSchema)
//2-
const bodyParser = require('body-parser')
/*
1-I can provide my own project, not the example url.
2-I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
3-I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
4-I can add an exercise to any user by posting form data userId(_id),description, duration, and optionally date to /api/exercise/add. If no date supplied it will use current date. App will return the user object with the exercise fields added.
5-I can retrieve a full exercise log of any user by getting /api/exercise/log with a query of userId(_id). App will return the user object with added array log and count(total exercise count).
6-I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date formatyyy-mm-dd, limit = int).
*/
//2-create a post route for the path
//model.save newer mongoose versions do not accept callbacks
app.post('/api/users', bodyParser.urlencoded({ extended: false }), (request, response) => {
  let newUser = new User({ username: request.body.username })
  newUser.save((error, savedUser) => {
    if (!error) {
      let responseObject = {}
      responseObject['username'] = savedUser.username
      responseObject['_id'] = savedUser.id
      response.json(responseObject)
    }
  })
})
//3-set u a get route
app.get('/api/users', (request, response) => {

  User.find({}, (error, arrayOfUsers) => {
    if (!error) {
      response.json(arrayOfUsers)
    }
  })
})
//4-
app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (request, response) => {
  let newSession = new Session({
    description: request.body.description,
    duration: parseInt(request.body.duration),
    date: request.body.date
  })

  if (!newSession.date) {
    newSession.date = new Date().toDateString();
  } else if (newSession.date) {
    newSession.date = new Date(newSession.date).toDateString();
  }

  User.findByIdAndUpdate(
    request.params._id,
    { $push: { log: newSession } },
    { new: true },
    (error, updatedUser) => {
      if (!error) {
        let responseObject = {}
        responseObject['_id'] = updatedUser.id
        responseObject['username'] = updatedUser.username
        responseObject['date'] = new Date(newSession.date).toDateString()
        responseObject['description'] = newSession.description
        responseObject['duration'] = newSession.duration
        response.json(responseObject)
      }

    }
  )
})
//5-set up a get route
app.get('/api/users/:_id/logs', (request, response) => {
  inputId = request.params._id;
  User.findById(inputId, (error, result) => {
    if (!error) {
      let responseObject = result
      //6-
      if (request.query.from || request.query.to) {

        let fromDate = new Date(0)
        let toDate = new Date()

        if (request.query.from) {
          fromDate = new Date(request.query.from)
        }

        if (request.query.to) {
          toDate = new Date(request.query.to)
        }

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        responseObject.log = responseObject.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()

          return sessionDate >= fromDate && sessionDate <= toDate
        })

      }
      if (request.query.limit) {
        responseObject.log = responseObject.log.slice(0, request.query.limit)
      }
      //5
      responseObject = responseObject.toJSON()
      responseObject['count'] = result.log.length
      response.json(responseObject)
    }
  })
})
