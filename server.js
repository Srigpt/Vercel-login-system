require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
const Timesheet = require('./models/timesheet');

// Create an Express app
const app = express();
const publicPath = path.join(__dirname, 'public');

// Connect to the database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1/login_system', { useNewUrlParser: true, useUnifiedTopology: true });

// Define the User schema
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

UserSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', UserSchema);


// Set up the middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(publicPath));

// Configure Passport
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Define routes
app.get('/', (req, res) => {
  console.log('GET /');
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
  } else {
    res.render('index');
  }
});

app.get('/login', (req, res) => {
  console.log('GET /login');
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}), (req, res) => {});

app.get('/register', (req, res) => {
  console.log('GET /register');
  res.render('register');
});

app.post('/register', (req, res) => {
  User.register(new User({ username: req.body.username }), req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      return res.render('register');
    }

    passport.authenticate('local')(req, res, () => {
      res.redirect('/dashboard');
    });
  });
});

app.get('/logout', (req, res) => {
  console.log('GET /logout');
  req.logout();
  res.redirect('/');
});

app.get('/dashboard', isLoggedIn, (req, res) => {
  console.log('GET /dashboard');
  res.render('dashboard');
});

app.get('/dashboard/submit-new-timesheet', isLoggedIn, (req, res) => {
  console.log('GET /dashboard/submit-new-timesheet');
  res.render('submit-new-timesheet');
});

app.post('/dashboard/submit-new-timesheet', isLoggedIn, async (req, res) => {
  console.log('POST /dashboard/submit-new-timesheet');

  const timesheet = new Timesheet({
    user: req.user._id,
    week: req.body.week,
    timesheetData: req.body.timesheetData
  });

  try {
    const savedTimesheet = await timesheet.save();
    res.status(200).send('Timesheet submitted successfully');
  } catch (err) {
    console.log(err);
    res.status(500).send('Error occurred while submitting timesheet');
  }
});

app.get('/dashboard/submitted-timesheets', isLoggedIn, async (req, res) => {
  console.log('GET /dashboard/submitted-timesheets');
  try {
    const timesheets = await Timesheet.find({ user: req.user._id });
    console.log(timesheets);
    res.render('submitted-timesheets', { timesheets });
  } catch (err) {
    console.log(err);
    res.status(500).send('Error occurred while fetching submitted timesheets');
  }
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

module.exports = app;
const port = process.env.PORT || 3000;

async function getTimesheetsByWeek(week) {
  try {
    const timesheets = await Timesheet.find({ week: week });
    return timesheets;
  } catch (error) {
    console.error('Error retrieving timesheets by week:', error);
    return [];
  }
}
app.get('/submitted-timesheets-data/:week', isLoggedIn, async (req, res) => {
  const week = req.params.week;
  try {
    const timesheets = await Timesheet.find({ user: req.user._id, week: week });
    res.status(200).json(timesheets);
  } catch (error) {
    console.error('Error retrieving timesheets by week:', error);
    res.status(500).send('Error occurred while fetching submitted timesheets');
  }
});



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});