const mongoose = require('mongoose');

var PostSchema = new mongoose.Schema({
	id: {
		type: Number, 
		unique: true,
		required: true,
	}, 
	title: {
		type: String, 
		required: true,
		trim: true
	},
	description: {
		type: String, 
		required: true,
	},
	pictureLink: {
		type: String, 
		required: true
	},
	updated: {
		type: Date,
		default: Date.now,
		required: true
	},
	creator: {
		type: String,
		required: true
	},
	latitude: {
		type: Number,
		required: true
	},
	longitude: {
		type: Number,
		required: true
	}
});



var Post = mongoose.model('Post', PostSchema);
module.exports = Post;