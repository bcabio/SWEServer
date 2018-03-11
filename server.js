const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
var User = require('./userSchema');
var Post = require('./postSchema');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser');
mongoose.connect('mongodb://admin:admin@ds161713.mlab.com:61713/swe-project');

var db = mongoose.connection;

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
});

const app = express();
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: 'work hard',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db
  })
}));

app.set('port', (process.env.PORT || 5000));

app.get('/', (req,res) => {
	res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/invalidUser', (req, res) => {
	res.sendFile(path.join(__dirname, '../public/error.html'));
});

app.get('/logout', (req, res) => {
	res.sendFile(path.join(__dirname, '../public/logout.html'));
});

app.get('/post/:postId', (req, res, next) => {
	Post.findOne({"id": req.params.postId}).exec(function(error, post) {
		if (error) {
			console.log('it died here');
			return next(error);
		} else {
			if (post === null) {
				var err = new Error('Not authorized');
				err.status = 400;
				console.log('lmao');
				return res.send(err);
			} else {
          return res.send(JSON.stringify({"id": post.id, "title": post.title, "description": post.description, "pictureLink": post.pictureLink}));
			}
		}
	})
	// res.send(JSON.stringify({'hello': 1}));
});

app.post('/register', function (req, res, next) {

	if (req.body.email &&
	  req.body.username &&
	  req.body.password &&
	  req.body.passwordConf) {

	  var userData = {	
	    email: req.body.email,
	    username: req.body.username,
	    password: req.body.password,
	    passwordConf: req.body.passwordConf,
	  }

	  //use schema.create to insert data into the db

	  User.create(userData, function (err, user) {
	    if (err) {
	    	console.log(err);
	      return res.redirect('/');
	    } else {
	    	console.log('gucii');
	      return res.redirect('/profile');
	    }
	  });
	} else if (!req.body.email ||
				!req.body.username ||
				!req.body.password || 
				!req.body.passwordConf) {
		var err = new Error('All fields are required');
		err.status = 401;
		return next(err);
	}
});

app.post('/login', function(req, res, next) {
	console.log(req.body.logemail);
	console.log(req.body.logpassword);
	User.authenticate(req.body.email, req.body.password, function(err, user) {
		if (err || !user) {
			var err = new Error('Email or pasword not found');
			err.status = 401;
			return res.redirect('/invalidUser');
		} else {
			console.log('we good');
			req.session.userId = user._id;
			return res.redirect('/profile');
		}
	});
});

app.get('/profile', function (req, res, next) {
	User.findById(req.session.userId).exec(function(error, user) {
		if (error) {
			return next(error);
		} else {
			if (user === null) {
				var err = new Error('Not authorized');
				err.status = 400;
				return next(err);
			} else {
          return res.send({"username": user.username, "email": user.email})
			}
		}
	})
});

app.get('/logout', function (req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/');
      }
    });
  }
});

app.listen(app.get('port'), () => {
	console.log("App listening on " + app.get('port'));
});
