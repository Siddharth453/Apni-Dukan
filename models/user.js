const mongoose = require('mongoose');
var passportLocalMongoose = require('passport-local-mongoose');
//SCHEMA SETUP
const UserSchema = new mongoose.Schema({
	username: String,
	password: String,
	isShopkeeper: { type: Boolean, default: false },
	fullname: String,
	phone: String,
	grocery: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Grocery'
		}
	],
	isPaid: { type: Boolean, default: false },
	address: String,
	country: String,
	pin: String,
	email: String
});
UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', UserSchema);
