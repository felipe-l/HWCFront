const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
const session = require('express-session');
const secret = crypto.randomBytes(64).toString('hex');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const fs = require('fs');
require('./config');
const apiKey = process.env.API_KEY;

mongoose.set('strictQuery', false);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Use the express-session middleware
app.use(session({
  secret: secret, // Used to sign the session ID cookie
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Define routes and middleware functions

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Connect to the MongoDB database
mongoose.connect(apiKey, { useNewUrlParser: true });


const nameSchema = new mongoose.Schema({
  name: {
      type: String,
      required: true
  },
  phone: {
      type: String,
      required: true
  },
  to: {
    type: String,
  },
  gameID: {
    type: String,
    required: true
  },
});

const gameSchema = new mongoose.Schema({
  name: {
      type: String,
      required: true
  },
  participants: [nameSchema]
});

// Define the user schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  games: [gameSchema],
});

userSchema.pre('save', function (next) {
    if (this.isModified('password')) {
      this.salt = bcrypt.genSaltSync(10);
      this.password = bcrypt.hashSync(this.password, this.salt);
    }
    next();
  })

// Create a model for the 'users' collection using the user schema
const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);
const Name = mongoose.model('Name', nameSchema);

// Define the '/register' route
app.post('/register', (req, res) => {
    console.log(req.body.username);
  // Create a new user
  const newUser = new User({
    username: req.body.username,
    password: req.body.password
  });

  // Save the user to the database
  newUser.save((err, user) => {
    if (err) {
      console.error(err);
      return;
    }

    // Redirect to the login page
    res.redirect('/');
  });
});

// Use the 'serializeUser' and 'deserializeUser' functions provided by Passport
// to store the authenticated user in the session
passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
passport.deserializeUser((id, done) => {
User.findById(id, (err, user) => {
    done(err, user);
});
});

// Define the '/secret' route
app.get('/secret', ensureAuthenticated, (req, res) => {
// Render the secret template for authenticated users
res.render('secret');
});

app.get('/try', (req, res) => {
  User.findOne({username: "new2"}, (error, user) => {
    if(error) {
      console.log(error);
    }else {
      console.log(user);
    }
  });
  
  res.send("HELLO");
});

app.get('/sec', (req, res) => {

  const newUser = new User({
    username: "new3",
    password: "new3",
    games: [],
  });
  newUser.save((err, user) => {
    if (err) {
      console.error(err);
      return;
    }
  });
  const newGame = new Game({
    name: "game6",
    participants: [],
  });
  newGame.save((err, user) => {
    if (err) {
      console.error(err);
      return;
    }
  });
  // Save the user to the database
  User.findOneAndUpdate({username: 'new3'}, {$push: {games: newGame}}, {new: true}, (error, doc) => {
    if(error) {
        console.log(error);
    } else {
        console.log(doc);
    }
  });
  User.findOne({ username: 'new3' }, (error, doc) => {
    if (error) {
        console.log(error);
    } else {
        console.log(doc.games);
    }
  });
  res.send("WOWOWLLLO");
});

// Middleware function to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        // User is authenticated, continue
        return next();
    }

    // User is not authenticated, redirect to the login page
    res.redirect('/');
}

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, (username, password, done) => {
    console.log("username:" + username + " password:" + password);
    User.findOne({ username: username }, (err, user) => {
        console.log(user);
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect email.' });
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }));

app.get('/test', (req, res) => {
  res.render('test');
});
// Define the '/login' route
app.post('/login', passport.authenticate('local', {
    successRedirect: '/secret',
    failureRedirect: '/fail'
}));

app.get('/logout', function(req, res) {
  req.logout(function(err) {
    if (err) {
      // An error occurred while logging out
      return res.send(err);
    }
    // The logout was successful
    req.session.destroy(function(err) {
      if (err) {
        // An error occurred while destroying the session
        return res.send(err);
      }
      // The session was successfully destroyed
      res.redirect('/');
    });
  });
});

app.get('/fail', (req,res)=> {
    res.send("FAILED!");
})

app.post('/add', (req, res) => {
  console.log(req.user.username);
  console.log("--------------------------");
  let names = req.body.names;
  let phones = req.body.phones;
  let gameName = req.body.gameName;
  console.log(names);
  console.log(phones);

  const pythonProcess = spawn('python3', ['shuffleNames.py']);
  pythonProcess.stdin.write(JSON.stringify(names));
  pythonProcess.stdin.end();
  let result = '';
  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });

  pythonProcess.on('close', () => {
    console.log(JSON.parse(result));
    res.send(JSON.parse(result));
    let secretSanta = JSON.parse(result);
    const newGame = new Game({
      name: gameName,
      participants: [],
    });
    newGame.save((err, user) => {
      if (err) {
        console.error(err);
        return;
      }
    });
    for (var x = 0; x < names.length; x++) {
      let newName = new Name({
        name: names[x],
        phone: phones[x],
        to: secretSanta[names[x]],
        gameID: newGame._id
      });

      newName.save((err, user) => {
        if (err) {
          console.error(err);
          return;
        }
        Game.findOneAndUpdate({name: gameName}, {$push: {participants: newName}}, {new: true}, (error, doc) => {
          if(error) {
              console.log(error);
          }
        });
      });
    }
    
    // Save the user to the database
    User.findOneAndUpdate({username: req.user.username}, {$push: {games: newGame}}, {new: true}, (error, doc) => {
      if(error) {
          console.log(error);
      }
    });
  });
  console.log(req.user.username);
});

app.get('/run-script', (req, res) => {
  const pythonProcess = spawn('python3', ['shuffleNames.py']);
  const list = ['item 1', 'item 2', 'item 3'];

  pythonProcess.stdin.write(JSON.stringify(list));
  pythonProcess.stdin.end();

  let result = '';
  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });

  pythonProcess.on('close', () => {
    console.log(JSON.parse(result));
    res.send(JSON.parse(result));
  });
});

app.post('/runHwc', (req, res) => {
  if (fs.existsSync("wireFile.wire")) {
    fs.unlinkSync("wireFile.wire");
  }

  if (fs.existsSync("inputFile.csv")) {
    fs.unlinkSync("inputFile.csv");
  }

  if (fs.existsSync("./public/graph.png")) {
    fs.unlinkSync("./public/graph.png");
  }

  if (fs.existsSync("wireFile.svg")) {
    fs.unlinkSync("wireFile.svg");
  }

  const code = req.body.code;
  const code1 = req.body.code1;
  console.log(code, code1);
  fs.writeFile('wireFile.wire', code, (err) => {
    if (err) throw err;
    console.log('File created successfully.');
  });
  fs.writeFile('inputFile.csv', code1, (err) => {
    if (err) throw err;
    console.log('File created successfully.');
  });
  setTimeout(function() {
    const pythonProcess = spawn('python3', ['../back/HWC22/hwcSim_py/sim_main.py', "--wire", "./wireFile.wire", "--input", "./inputFile.csv"]);
    pythonProcess.stdout.on('data', (data) => {
      console.error(`result: ${data}`);
      res.send({ result: data.toString() });
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
  }, 800);

  const svgFilePath = 'wireFile.svg';
  const pngFilePath = './public/graph.png';
  setTimeout(function() {
  const dotProcess = spawn('dot', ['-Tpng', svgFilePath, '-o', pngFilePath]);
  console.log("RUNNING");
  dotProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`dot process exited with code ${code}`);
      return;
    }
  
    console.log(`SVG file saved to ${pngFilePath}`);
  });
  }, 1500);
});

// Render the index template for the root path
app.get('/', (req, res) => {
  res.render('index');
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});