require('dotenv').config();
const passportLocalMongoose = require('passport-local-mongoose'),
	methodOverride = require('method-override'),
	localStrategy = require('passport-local'),
	bodyParser = require('body-parser'),
	passport = require('passport'),
	mongoose = require('mongoose'),
	express = require('express'),
	Grocery = require('./models/grocery'),
	stripe = require('stripe')(process.env.SECRET_KEY),
	flash = require('connect-flash'),
	Draft = require('./models/draft'),
	User = require('./models/user'),
	sgMail = require('@sendgrid/mail'),
	app = express();
const sendgridAPIKey = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(sendgridAPIKey);

//APP CONFIGURATION
const port = process.env.PORT;
mongoose.connect(process.env.DATABASE_URL, { useUnifiedTopology: true, useNewUrlParser: true });
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(flash());
app.use(express.static('assets'));
app.locals.moment = require('moment');

//PASSPORT CONFIGURATION
app.use(
	require('express-session')({
		secret: 'New User Model In Local Shopping App',
		resave: false,
		saveUninitialized: false
	})
);
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//ROUTES
app.get('/', (req, res) => {
	if (req.user) {
		if (req.user.isShopkeeper) {
			res.redirect('/shopkeeper');
		} else {
			res.redirect('/buyer');
		}
	} else {
		res.render('home.ejs', { currentUser: req.user });
	}
});
app.get('/profile/me', isLoggedIn, (req, res) => {
	res.render('profile.ejs', { currentUser: req.user });
});
app.get('/shopkeeper', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		User.findById(req.user.id).populate('grocery').exec((error, user) => {
			if (error) throw error;
			else {
				res.render('shopkeeper', {
					currentUser: req.user,
					user: user
				});
			}
		});
	}
});
//Buyer
app.get('/buyer', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		res.render('buyer', { currentUser: req.user });
	}
});
app.get('/buyer/drafts/carts', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Draft.find({}, (error, drafts) => {
			if (error) {
				console.log(error);
			} else {
				res.render('draftCarts', { drafts: drafts.reverse(), currentUser: req.user });
			}
		});
	}
});
app.post('/updatepin', isLoggedIn, (req, res) => {
	const updateUser = {
		pin: req.body.pin
	};
	User.findByIdAndUpdate(req.user.id, updateUser, (error, updatedUser) => {
		if (error) {
			console.log(error);
		} else {
			if (updatedUser.id == req.user.id) {
				res.redirect(`/profile/me`);
			} else {
				res.redirect(`/buyer`);
			}
		}
	});
});
app.post('/updateaddress', isLoggedIn, (req, res) => {
	const updateUser = {
		address: req.body.address
	};
	User.findByIdAndUpdate(req.user.id, updateUser, (error, updatedUser) => {
		if (error) {
			console.log(error);
		} else {
			if (updatedUser.id == req.user.id) {
				res.redirect(`/profile/me`);
			} else {
				res.redirect(`/buyer`);
			}
		}
	});
});
app.post('/updatecountry', isLoggedIn, (req, res) => {
	const updateUser = {
		country: req.body.country
	};
	User.findByIdAndUpdate(req.user.id, updateUser, (error, updatedUser) => {
		if (error) {
			console.log(error);
		} else {
			if (updatedUser.id == req.user.id) {
				res.redirect(`/profile/me`);
			} else {
				res.redirect(`/buyer`);
			}
		}
	});
});
app.get('/buyer/drafts/carts/:id', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Draft.findById(req.params.id, (error, drafts) => {
			if (error) {
				console.log(error);
			} else {
				res.render('showCarts', { drafts: drafts, currentUser: req.user, error: req.flash('nouserfound') });
			}
		});
	}
});
app.get('/carts/new', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		res.render('newCart', { currentUser: req.user });
	}
});
app.get('/shopkeepers', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		User.find({ isShopkeeper: true, pin: req.user.pin, country: req.user.country }, (error, shopkeepers) => {
			if (error) {
				res.redirect('/shopkeepers');
			} else res.render('shopkeepers', { currentUser: req.user, shopkeepers: shopkeepers });
		});
	}
});
app.get('/users/:id', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		User.findById(req.params.id).populate('grocery').exec((error, user) => {
			if (error) {
				req.flash('nouser', 'No User found with this ID!');
				res.redirect('/shopkeepers');
			} else {
				res.render('showUser', { currentUser: req.user, user });
			}
		});
	}
});
app.get('/users/:id/carts/new', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		res.render('userCart', { currentUser: req.user, id: req.params.id });
	}
});
app.post('/users/id', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		res.redirect(`/users/${req.body.id}`);
	}
});
app.post('/draftCart', isLoggedIn, (req, res) => {
	var newDraft = {
		cartTitle: req.body.cartTitle,
		cartDescription: req.body.cartDescription,
		groceryName: req.body.groceryName,
		groceryQuantity: req.body.groceryQuantity,
		groceryUnit: req.body.groceryUnit,
		groceryUser: req.body.groceryUser
	};
	Draft.create(newDraft, (error, newDraft) => {
		if (error) {
			console.log(error);
		} else {
			newDraft.groceryUser.id = req.user.id;
			newDraft.groceryUser.fullname = req.user.fullname;
			newDraft.groceryUser.phone = req.user.phone;
			newDraft.save();
			res.redirect('/buyer');
		}
	});
});
app.post('/buyer/posts/carts/:id/chooseuser', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		User.find({ isShopkeeper: true, pin: req.user.pin, country: req.user.country }, (error, shopkeepers) => {
			if (error) res.redirect('shopkeepers');
			else {
				res.render('chooseShopkeeper', { currentUser: req.user, shopkeepers, id: req.params.id });
			}
		});
	}
});
app.post('/buyer/posts/carts/:groceryid/:userid', isLoggedIn, (req, res) => {
	User.findById(req.params.userid, (error, user) => {
		if (error) {
			req.flash('nouserfound', 'Operation was cancelled because no user exists with this ID!');
			res.redirect(`/buyer/drafts/carts/${req.params.groceryid}`);
		} else {
			Draft.findById(req.params.groceryid, (error, drafts) => {
				if (error) {
					req.flash('nouserfound', 'Operation was cancelled because no user exists with this ID!');
					res.redirect(`/buyer/drafts/carts/${req.params.groceryid}`);
				} else {
					var newInfo = {
						cartTitle: drafts.cartTitle,
						cartDescription: drafts.cartDescription,
						groceryUser: drafts.groceryUser,
						groceryName: drafts.groceryName,
						groceryQuantity: drafts.groceryQuantity,
						groceryUnit: drafts.groceryUnit,
						groceryShopkeeper: req.params.userid
					};
					Grocery.create(newInfo, (error, newGrocery) => {
						if (error) {
							req.flash('nouserfound', 'Operation was cancelled because no user exists with this ID!');
							res.redirect(`/buyer/drafts/carts/${req.params.groceryid}`);
						} else {
							user.grocery.push(newGrocery);
							user.save();
							newGrocery.groceryUser.id = req.user.id;
							newGrocery.groceryUser.fullname = req.user.fullname;
							newGrocery.groceryUser.phone = req.user.phone;
							newGrocery.groceryUser.email = req.user.email;
							newGrocery.groceryUser.address = req.user.address;
							newGrocery.groceryUser.country = req.user.country;
							newGrocery.groceryUser.pin = req.user.pin;
							newGrocery.save();
							const msg = {
								to: user.email,
								from: 'apnidukan132@gmail.com',
								subject: 'Notification | Apni Dukan',
								text: `Hi ${user.fullname},
									  ${newGrocery.groceryUser.fullname} has ordered a new cart to you. Check it to deliver it.
									  Go to https://${req.headers.host}/shopkeeper/orders/${newGrocery.id}
								`,
								html: `
									<h1>Hi ${user.fullname},</h1>
										<p>${newGrocery.groceryUser.fullname} has ordered a new cart to you. Check it to deliver it.</p>
										<a href="https://${req.headers.host}/shopkeeper/orders/${newGrocery.id}">Go to https://${req.headers
									.host}/shopkeeper/orders/${newGrocery.id}.</a>
								`
							};
							sgMail.send(msg);
							res.redirect('/buyer/posts/carts');
						}
					});
					Draft.findByIdAndRemove(req.params.groceryid, (error, removeDraft) => {
						if (req.user.isShopkeeper) {
							if (error) {
								req.flash(
									'nouserfound',
									'Operation was cancelled because no user exists with this ID!'
								);
								res.redirect(`/buyer/drafts/carts/${req.params.groceryid}`);
							} else {
								if (removeDraft.groceryUser.id == req.user.id) {
									res.redirect('/draft');
								}
							}
						}
					});
				}
			});
		}
	});
});
app.post('/buyer/post/carts/:id/', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/buyer');
	} else {
		User.findById(req.params.id, (error, user) => {
			if (error) {
				console.log(error);
				res.redirect('/buyer');
			} else {
				var newInfo = {
					cartTitle: req.body.cartTitle,
					cartDescription: req.body.cartDescription,
					groceryUser: req.body.groceryUser,
					groceryName: req.body.groceryName,
					groceryQuantity: req.body.groceryQuantity,
					groceryUnit: req.body.groceryUnit,
					groceryShopkeeper: req.params.userid
				};
				Grocery.create(newInfo, (error, newGrocery) => {
					if (error) {
						console.log(error);
					} else {
						user.grocery.push(newGrocery);
						user.save();
						newGrocery.groceryUser.id = req.user.id;
						newGrocery.groceryUser.fullname = req.user.fullname;
						newGrocery.groceryUser.phone = req.user.phone;
						newGrocery.save();
						res.redirect('/buyer/posts/carts');
					}
				});
			}
		});
	}
});
app.get('/buyer/posts/carts', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Grocery.find({}, (error, postedCarts) => {
			if (error) {
				console.log(error);
			} else {
				res.render('postCarts', { currentUser: req.user, posted: postedCarts.reverse() });
			}
		});
	}
});
app.get('/buyer/posts/carts/:id', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Grocery.findById(req.params.id, (error, posted) => {
			if (error) {
				console.log(error);
			} else {
				let total;
				let t = 0;
				for (let i = 0; i < posted.groceryBill.length; i++) {
					t = parseInt(posted.groceryBill[i]) + t;
				}
				total = t;
				res.render('showPostCarts', { grocery: posted, currentUser: req.user, total: total });
			}
		});
	}
});
app.get('/buyer/drafts/carts/:id/edit', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Draft.findById(req.params.id, (error, editDraft) => {
			if (error) {
				console.log(error);
			} else {
				if (editDraft.groceryUser.id == req.user.id) {
					res.render('edit', { currentUser: req.user, draft: editDraft });
				} else {
					res.redirect('/buyer');
				}
			}
		});
	}
});
app.put('/buyer/drafts/carts/:id/edit', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		const updateDraft = {
			cartTitle: req.body.cartTitle,
			cartDescription: req.body.cartDescription,
			groceryName: req.body.groceryName,
			groceryQuantity: req.body.groceryQuantity,
			groceryUnit: req.body.groceryUnit
		};
		Draft.findByIdAndUpdate(req.params.id, updateDraft, (error, updatedDraft) => {
			if (error) {
				console.log(error);
			} else {
				if (updatedDraft.groceryUser.id == req.user.id) {
					res.redirect(`/buyer/drafts/carts/${req.params.id}`);
				} else {
					res.redirect(`/buyer/drafts/carts/${req.params.id}`);
				}
			}
		});
	}
});
app.delete('/buyer/drafts/carts/:id/remove', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Draft.findByIdAndRemove(req.params.id, (error, removeDraft) => {
			if (error) {
				console.log(error);
			} else {
				if (removeDraft.groceryUser.id == req.user.id) {
					res.redirect('/buyer/drafts/carts');
				} else {
					res.redirect('/buyer/drafts/carts');
				}
			}
		});
	}
});
app.delete('/buyer/posts/carts/:id/remove', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Grocery.findByIdAndRemove(req.params.id, (error, removeDraft) => {
			if (error) {
				console.log(error);
			} else {
				if (removeDraft.groceryUser.id == req.user.id) {
					res.redirect('/buyer/posts/carts');
				} else {
					res.redirect('/buyer/posts/carts');
				}
			}
		});
	}
});
//Shopkeeper
app.get('/shopkeeper/orders', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		User.findById(req.user.id).populate('grocery').exec((error, user) => {
			if (error) throw error;
			else res.render('order', { currentUser: req.user, grocery: user });
		});
	}
});
app.get('/shopkeeper/orders/:id/unpaid', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				grocery.isPaid = false;
				grocery.save();
				res.redirect(`/shopkeeper/orders/${req.params.id}`);
			}
		});
	}
});
app.get('/shopkeeper/orders/:id/paid', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				grocery.isPaid = true;
				grocery.save();
				res.redirect(`/shopkeeper/orders/${req.params.id}`);
			}
		});
	}
});
app.get('/shopkeeper/orders/:id/incomplete', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				grocery.isCompleted = false;
				grocery.save();
				res.redirect(`/shopkeeper/orders/${req.params.id}`);
			}
		});
	}
});
app.get('/shopkeeper/orders/:id/complete', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				grocery.isCompleted = true;
				grocery.save();
				const msg = {
					to: grocery.groceryUser.email,
					from: 'apnidukan132@gmail.com',
					subject: 'Notification | Apni Dukan',
					text: `Hi ${grocery.groceryUser.fullname},
									  Your order #${req.params.id} has been delivered, please check.
									  Go to https://${req.headers.host}/buyer/posts/carts/${grocery.id}
								`,
					html: `
									<h1>Hi ${grocery.groceryUser.fullname},</h1>
										<p>Your order #${req.params.id} has been delivered, please check.</p>
										<a href="https://${req.headers.host}/buyer/posts/carts/${grocery.id}">Go to https://${req.headers
						.host}/buyer/posts/carts/${grocery.id}.</a>
								`
				};
				sgMail.send(msg);
				console.log(msg);
				res.redirect(`/shopkeeper/orders/${req.params.id}`);
			}
		});
	}
});
app.get('/shopkeeper/orders/:id/bill', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				res.render('bill', { currentUser: req.user, grocery });
			}
		});
	}
});
app.get('/shopkeeper/orders/:id/deliver-time', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				res.render('deliverTime', { currentUser: req.user, grocery });
			}
		});
	}
});
app.post('/shopkeeper/orders/:id/deliver-time', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				grocery.deliver = `${req.body.deliver}  ${req.body.deliverTime}`;
				grocery.save();
				const msg = {
					to: grocery.groceryUser.email,
					from: 'apnidukan132@gmail.com',
					subject: 'Notification | Apni Dukan',
					text: `Hi ${grocery.groceryUser.fullname},
				  The Delivery time of order #${req.params.id} has been changed to ${req.body.deliver}  ${req.body
						.deliverTime}, please check.
				  Go to https://${req.headers.host}/buyer/posts/carts/${grocery.id}
			`,
					html: `
				<h1>Hi ${grocery.groceryUser.fullname},</h1>
					<p>The Delivery time of order <b style="color: #a1a1a1"><em>#${req.params.id}</em></b> has been changed to ${req
						.body.deliver}  ${req.body.deliverTime}, please check.</p>
					<a href="https://${req.headers.host}/buyer/posts/carts/${grocery.id}">Go to https://${req.headers
						.host}/buyer/posts/carts/${grocery.id}.</a>
			`
				};
				sgMail.send(msg);
				res.redirect(`/shopkeeper/orders/${req.params.id}`);
			}
		});
	}
});
app.post('/shopkeeper/orders/:id/bill', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) throw error;
			else {
				grocery.groceryBill = req.body.groceryBill;
				grocery.deliver = `${req.body.deliver}  ${req.body.deliverTime}`;
				grocery.save();
				const msg = {
					to: grocery.groceryUser.email,
					from: 'apnidukan132@gmail.com',
					subject: 'Notification | Apni Dukan',
					text: `Hi ${grocery.groceryUser.fullname},
				 The bill of order #${req.params.id} has been generated, please Check.
				  Go to https://${req.headers.host}/buyer/posts/carts/${grocery.id}
			`,
					html: `
				<h1>Hi ${grocery.groceryUser.fullname},</h1>
					<p> The bill of order <b style="color:#a1a1a1"><em>#${req.params.id}</em></b> has been generated, please Check.</p>
					<a href="https://${req.headers.host}/buyer/posts/carts/${grocery.id}">Go to https://${req.headers
						.host}/buyer/posts/carts/${grocery.id}.</a>. To check the bill.
			`
				};
				sgMail.send(msg);
				res.redirect(`/shopkeeper/orders/${req.params.id}`);
			}
		});
	}
});
app.get('/shopkeeper/orders/incomplete', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		User.findById(req.user.id).populate('grocery').exec((error, user) => {
			if (error) throw error;
			else {
				res.render('incomplete', { currentUser: req.user, grocery: user });
			}
		});
	}
});
app.get('/shopkeeper/orders/complete', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		User.findById(req.user.id).populate('grocery').exec((error, user) => {
			if (error) throw error;
			else {
				res.render('complete', { currentUser: req.user, grocery: user });
			}
		});
	}
});
app.get('/shopkeeper/orders/:id', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.findById(req.params.id, (error, grocery) => {
			if (error) res.redirect('/shopkeeper/orders');
			else {
				let total;
				let t = 0;
				for (let i = 0; i < grocery.groceryBill.length; i++) {
					t = parseInt(grocery.groceryBill[i]) + t;
				}
				total = t;
				res.render('showOrder', { currentUser: req.user, grocery: grocery, total: total });
			}
		});
	}
});
//PAYMENT
app.get('/payment', isLoggedIn, (req, res) => {
	// res.render('payment', {
	// 	key: process.env.PUBLISHABLE_KEY,
	// 	currentUser: req.user
	// });
	res.redirect('/shopkeeper');
});
app.post('/payment', (req, res) => {
	// stripe.customers
	// 	.create({
	// 		email: req.body.stripeEmail,
	// 		source: req.body.stripeToken,
	// 		name: 'Apni Dukan'
	// 	})
	// 	.then((customer) => {
	// 		return stripe.charges.create({
	// 			amount: 100000,
	// 			description: 'Buy Apni Dukan to reactivate your account',
	// 			currency: 'INR',
	// 			customer: customer.id
	// 		});
	// 	})
	// 	.then((charge) => {
	// 		req.user.isPaid = true;
	// 		req.user.save();
	// 		console.log(charge);
	// 		res.redirect('/');
	// 	})
	// 	.catch((err) => {
	// 		res.send(err);
	// 	});
	res.redirect('/shopkeeper');
});
//CONTACT
app.get('/contact', (req, res) => {
	res.render('contact', { currentUser: req.user, success: req.flash('contact') });
});
app.post('/contact', (req, res) => {
	const msg = {
		to: 'apnidukan132@gmail.com',
		from: 'apnidukan132@gmail.com',
		subject: `Email from ${req.body.name} | Apni Dukan`,
		text: `Hi Apni Dukan Owner,
			   ${req.body.name} wants a help from you, his/her message is below.
			   "Hi Apni Dukan Owner,
			   ${req.body.message}"

			   From:
			   ${req.body.name}(${req.body.email})
                  
			   To:
			   Apni Dukan Owner(apnidukan132@gmail.com) 
					`,
		html: `
		<h1>Hi Apni Dukan Owner,</h1>
		<p>${req.body.name} wants a help from you, his/her message is below.</p>
		<div class="container" align="center">
		<b><em><h1>Hi Apni Dukan Owner,</h1>
		<h3>${req.body.message}</h3></em></b>
		</div><br>
        <div class="container">
		<p>From:</p>
		<p>${req.body.name}(${req.body.email})</p>
		   
		<p>To:</p>
		<p>Apni Dukan Owner(apnidukan132@gmail.com)</p>
		</div>	
					`
	};
	sgMail.send(msg);
	req.flash(
		'contact',
		`We have got your email and will respond you as soon as possible to the email ${req.body.email}.`
	);
	res.redirect('/contact');
});
//Auth Routes
// show register form
app.get('/register', function(req, res) {
	res.render('register', { currentUser: req.user, error: req.flash('errorinsignup') });
});
//handle sign up logic
app.post('/register', function(req, res) {
	let shopkeeper;
	if (req.body.isShopkeeper) {
		shopkeeper = true;
	} else {
		shopkeeper = false;
	}
	var newUser = new User({
		username: req.body.username,
		fullname: req.body.fullname,
		isShopkeeper: shopkeeper,
		phone: req.body.number,
		address: req.body.address,
		country: req.body.country,
		pin: req.body.pin,
		email: req.body.email
	});
	User.register(newUser, req.body.password, function(err, user) {
		if (err) {
			req.flash('errorinsignup', err.message);
			res.redirect('/register');
		}
		passport.authenticate('local')(req, res, function() {
			req.flash('success', 'Nice To Meet You ' + req.user.fullname + ', You Have Successfully Signed up!');
			res.redirect('/');
		});
	});
});
// show login form
app.get('/login', function(req, res) {
	res.render('login', { currentUser: req.user, error: req.flash('error') });
});
//handling login logic
app.post(
	'/login',
	passport.authenticate('local', {
		successRedirect: '/',
		failureFlash: 'Incorrect Username or Password!',
		failureRedirect: '/login'
	}),
	function(req, res) {}
);
//Logout logic
app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

// 404 NOT FOUND
app.get('*', (req, res) => {
	res.render('404', { currentUser: req.user });
});
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	req.flash('error', 'You Need To Be Logged In First!!');
	res.redirect('/login');
}

//SERVER CONFIGURATION
app.listen(port, process.env.IP, () => {
	console.log(`Application's Server is up on Port: ${port}`);
});
