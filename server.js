const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

var User = require('./userSchema');
var Post = require('./postSchema');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var bodyParser = require('body-parser');
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
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
  secret: 'work hard',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db
  })
}));

app.set('port', (process.env.PORT || 5000));

// app.get('/', (req,res) => {
// 	res.sendFile(path.join(__dirname, '../public/index.html'));
// });

// app.get('/invalidUser', (req, res) => {
// 	res.sendFile(path.join(__dirname, '../public/error.html'));
// });

// app.get('/logout', (req, res) => {
// 	res.sendFile(path.join(__dirname, '../public/logout.html'));
// });

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

	console.log(req.body);
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
	      return next(err);
	    } else {
	    	console.log('gucii');
          req.session.userId = user._id;
	      return res.json({"reg": "Registration Complete!"});
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
	console.log(req.body);
	console.log(req.body.logemail);
	console.log(req.body.logpassword);
	User.authenticate(req.body.logemail, req.body.logpassword, function(err, user) {
		if (err || !user) {
			var err = new Error('Email or pasword not found');
			err.status = 401;
			return {"body": "Not okay"};
		} else {
			console.log('we good');
			req.session.userId = user._id;
			return{"good": "login complete"};
		}
	});
});

app.get('/profile', function (req, res, next) {
	User.findById(req.session.userId).exec(function(error, user) {
		if (error) {
			return error;
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
        return "logged out";
      }
    });
  }
});

app.listen(app.get('port'), () => {
	console.log("App listening on " + app.get('port'));
});
