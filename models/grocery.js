const mongoose = require('mongoose');

//SCHEMA SETUP
const grocerySchema = new mongoose.Schema({
	cartTitle: String,
	cartDescription: String,
	groceryName: [ String ],
	groceryQuantity: [ String ],
	groceryUnit: [ String ],
	groceryBill: [ String ],
	groceryUser: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		fullname: String,
		phone: String,
		address: String,
		country: String,
		pin: String,
		email: String
	},
	deliver: String,
	groceryShopkeeper: mongoose.Schema.Types.ObjectId,
	isCompleted: { type: Boolean, default: false },
	isPaid: { type: Boolean, default: false },
	created: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('Grocery', grocerySchema);
