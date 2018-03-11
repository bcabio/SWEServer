const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// mongoose.connect('mongodb://admin:admin@ds161713.mlab.com:61713/swe-project');

var UserSchema = new mongoose.Schema({
	email: {
		type: String, 
		unique: true,
		required: true,
		trim: true
	}, 
	username: {
		type: String, 
		unique: true,
		required: true,
		trim: true
	},
	password: {
		type: String, 
		required: true,
	},
	passwordConf: {
		type: String, 
		required: true
	}
});

UserSchema.pre('save', function (next) {
	var user = this;
  bcrypt.hash(user.password, 10, function (err, hash) {
    if (err) {
    	console.log(err);
      return next(err);
    }
    console.log('good');
    user.password = hash;
    user.passwordConf = hash;
    next();
  })
});

UserSchema.statics.authenticate = function(email, pass, cb) {
	User.findOne({email: email}).exec(function(err, u) {
		if (err)
			return cb(err);
		else if(!u) {
			var err = new Error('User not found');
			err.status = 401;
			return cb(err);
		}
		bcrypt.compare(pass, u.password, function(err, result) {
			if (result === true) 
				return cb(null, u);
			else
				return cb();
		});
	});
}


var User = mongoose.model('User', UserSchema);
module.exports = User;