const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv').config();
const cors = require('cors');
const Geocodio = require('geocodio');
const sortByDistance = require('sort-by-distance');

var User = require('./userSchema');
var Post = require('./postSchema');

var session = require('express-session');
// var cookieSession = require('cookie-session');
var MongoStore = require('connect-mongo')(session);
var bodyParser = require('body-parser');
mongoose.connect(process.env.MONGO_URL);
var geocodio = new Geocodio({api_key: process.env.GEOCODIO_API_KEY});

var db = mongoose.connection;
var nextID = 0;

//handle mongo error
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  // we're connected!
  // Find highest id for posts
  Post.find().sort({id:-1}).limit(1).exec(function(error, posts) {
    if(error) {
        console.log("oh no");
    } else {
        if (posts == null) {
            console.log("The database is empty");
        } else {
            nextID = posts[0].id + 1;
        }
    }
  })
});

const app = express();

app.use(cors({
  origin: true,
  credentials: true
  }));
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
  	secure: false
  }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static(__dirname));

// app.use(function(req, res, next) {
//   // res.setHeader('Access-Control-Allow-Origin', "https://swe-server.herokuapp.com/");
//   // res.setHeader('Access-Control-Allow-Credentials', true);
//   // res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//   return next();
// });


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
  console.log(req.session);
    Post.find({
        $and: [
            {'id': {$gte: 0}},
            {'id': {$lte: 20}}
        ]
    }).sort({id:-1}).exec(function(error, posts) {
        if (error) {
            return next(error);
        } else {
            if (posts === null) {
                var err = new Error('Not authorized');
                err.status = 400;
                return res.send(err);
            } else {
                const options = {
                  yName: 'latitude',
                  xName: 'longitude'
                }

                // const origin = 


                return res.send(JSON.stringify(posts));
            }
        }
    })
});

app.post('/submitPost', function (req, res, next) {
    console.log(req.session);
    console.log(req.body);
    if (req.body.title &&
        req.body.description &&
        req.body.pictureLink) {

        var postData = {  
            id: nextID,
            title: req.body.title,
            description: req.body.description,
            pictureLink: req.body.pictureLink,
            creator: req.body.creator,
            latitude: req.body.latitude,
            longitude: req.body.longitude
        }

        //use schema.create to insert data into the db
        Post.create(postData, function (err, user) {
            if (err) {
                if (isNaN(parseFloat(postData.latitude)) || isNaN(parseFloat(postData.longitude)))
                  return res.send({"response": "Unable to acquire your geo location from your profile. Please go to your profile page to enable geolocation"});
                return res.send({"response": "error some how" + err.message});
            } else {
                nextID = nextID + 1;
                return res.send({"response": "Thank you for submitting a post!"});
            }
        });
    } else if (!req.body.title ||
                !req.body.description ||
                !req.body.pictureLink) {
        var err = new Error('All fields are required');
        err.status = 401;
        return res.send({"response": "All fields are required"});
    } else {
        return res.send({"response": "really bad error"})
    }
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
	      return res.send({"response": "User already exists"});
	    } else {
        req.session.userId = user._id;
        return res.send({"response": "Registration Complete. Please Log in"});
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
      console.log(err);
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


app.post('/updateSession', function(req, res, next) {
  Object.keys(req.body).forEach((fieldName) => {
    if (fieldName === 'longitude' || fieldName === 'latitude')
      req.session[fieldName] = parseFloat(req.body[fieldName]);
  }); 
  console.log(req.session);
  console.log(req.body);
  res.send('ok');
});

app.post('/updateProfile', function(req, res, next) {
  Object.keys(req.body).forEach((fieldName) => {
    if (fieldName === 'longitude' || fieldName === 'latitude')
      req.session[fieldName] = parseFloat(req.body[fieldName]);
      req.body[fieldName] = parseFloat(req.body[fieldName]);
  });
  User.findByIdAndUpdate(req.session.userId, {$set: req.body}).exec(function(error, user) {
    console.log(user);
    if (error) {
      console.log(error);
    } else {
      if (user === null) {
        console.log('null');
        res.send({'response': 'User not updated'});
      } else {
        res.send("ok")
      }
    }
  });
});


app.get('/profile', function (req, res, next) {
  console.log('profile req.session', req.session);
	User.findById(req.session.userId).exec(function(error, user) {
		if (error) {
			return error;
		} else {
      console.log(user);
			if (user === null) {
				var err = new Error('Not authorized');
				err.status = 400;
				res.send({'response': 'Unauthorizedd'});
			} else {

        let data = {
          username: user['username'],
          email: user['email']
        }

        if(user['longitude'] != null || user['latitude'] != null) {
          data['longitude'] = user['longitude']
          data['latitude'] = user['latitude']
        }

        res.send(JSON.stringify(data));
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
  console.log('req.session', req.session);
	if (req.session) {
    	// delete session object
    	req.session.destroy(function (err) {
        if (err) {
        	res.send({"response": "Something went wrong"});
        } else {
          res.send({"response": "logged out"});
        }
    });
          console.log('logged out');
  }

});

app.listen(app.get('port'), () => {
	console.log('App listening on ' + app.get('port'));
});
