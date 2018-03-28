const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv').config();
const cors = require('cors');

var User = require('./userSchema');
var Post = require('./postSchema');

var session = require('express-session');
// var cookieSession = require('cookie-session');
var MongoStore = require('connect-mongo')(session);
var bodyParser = require('body-parser');
mongoose.connect(process.env.MONGO_URL);

var db = mongoose.connection;

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
});

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(session({
  secret: 'work hard',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: db,
    stringify: false
  }),
  cookie: {
  	maxAge: (4*60*60*1000),
  	secure: true
  }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(__dirname));

app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
	res.setHeader('Access-Control-Allow-Credentials', true);
	return next();
});




app.set('port', (process.env.PORT || 5000));

app.get('/post/:postId', (req, res, next) => {
	Post.findOne({'id': req.params.postId}).exec(function(error, post) {
		if (error) {
			return res.send({'response': err})
		} else {
			if (post === null) {
				var err = new Error('Not authorized');
				err.status = 400;
				return res.send(err);
			} else {
          		return res.send(JSON.stringify({'id': post.id, 'title': post.title, 'description': post.description, 'pictureLink': post.pictureLink}));
			}
		}
	})
});


app.get('/posts', (req, res, next) => {
    Post.find({
        $and: [
            {'id': {$gte: 0}},
            {'id': {$lte: 20}}
        ]
    }).exec(function(error, posts) {
        if (error) {
            return next(error);
        } else {
            if (posts === null) {
                var err = new Error('Not authorized');
                err.status = 400;
                return res.send(err);
            } else {
                return res.send(JSON.stringify(posts));
            }
        }
    })
});

app.post('/register', function (req, res, next) {
	if (req.body.email &&
	  req.body.username &&
	  req.body.password &&
	  req.body.passwordConf) {

      if (req.body.password != req.body.passwordConf) 
	  	return res.send({'response': 'The passwords must match!'});

	  var userData = {	
	    email: req.body.email,
	    username: req.body.username,
	    password: req.body.password,
	    passwordConf: req.body.passwordConf,
	  }

	  
	  //use schema.create to insert data into the db

	  User.create(userData, function (err, user) {
	    if (err) {
	      return res.redirect('/profile');
	    } else {
          req.session.userId = user._id;
	      return res.redirect('/post/1');
	    }
	  });


	} else if (!req.body.email ||
				!req.body.username ||
				!req.body.password || 
				!req.body.passwordConf) {

		var err = new Error('All fields are required');
		err.status = 401;
		res.send({"response": "The user already exists"});
	} else {
		res.send({"response": "Thank you, " + req.body.username + ", your registration is complete!"});
	}
});

app.post('/login', function(req, res, next) {
	User.authenticate(req.body.logemail, req.body.logpassword, function(err, user) {
		if (err || !user) {
			var err = new Error('Email or pasword not found');
			err.status = 401;
			res.send({'response': 'Email or Password Not Found'});
		} else {

			let options = {
		        maxAge: 1000 * 60 * 15, // will expire after 15 minutes
		        httpOnly: true, 
		        signed: false 
		    }
			req.session.userId = user._id;
			res.send({'response': 'You have Logged in Successfully!'});
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
				res.send({'response': 'Unauthorizedd'});
			} else {
          		res.send({'username': user.username, 'email': user.email})
			}
		}
	});
});

app.get('/profiles', function(req, res, next) {
	User.find({}, function(err, users) {
		var userMap = [];
		users.forEach(function(user) {
			userMap.push(user);
		});
		res.send(userMap);
	});

});

app.get('/logout', function (req, res, next) {
	if (req.session) {
    	// delete session object
    	req.session.destroy(function (err) {
        if (err) {
        	return next(err);
        } else {
            return ({'response': 'logged out'});
        }
    });
  }

});

app.listen(app.get('port'), () => {
	console.log('App listening on ' + app.get('port'));
});
