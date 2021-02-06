const mongoose = require('mongoose');

//SCHEMA SETUP
const draftSchema = new mongoose.Schema({
	cartTitle: String,
	cartDescription: String,
	groceryName: [ String ],
	groceryQuantity: [ String ],
	groceryUnit: [ String ],
	groceryUser: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		fullname: String
	},
	created: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('Draft', draftSchema);
