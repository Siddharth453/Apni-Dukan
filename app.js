require('dotenv').config();
const passportLocalMongoose = require('passport-local-mongoose'),
	methodOverride = require('method-override'),
	localStrategy = require('passport-local'),
	bodyParser = require('body-parser'),
	passport = require('passport'),
	mongoose = require('mongoose'),
	express = require('express'),
	Grocery = require('./models/grocery'),
	flash = require('connect-flash'),
	Draft = require('./models/draft'),
	User = require('./models/user'),
	app = express();

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
		res.render('shopkeeper', { currentUser: req.user });
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
				res.render('draftCarts', { drafts: drafts, currentUser: req.user });
			}
		});
	}
});
app.get('/buyer/drafts/carts/:id', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Draft.findById(req.params.id, (error, drafts) => {
			if (error) {
				console.log(error);
			} else {
				res.render('showCarts', { drafts: drafts, currentUser: req.user });
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
app.post('/buyer/posts/carts/:id', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Draft.findById(req.params.id, (error, drafts) => {
			if (error) {
				console.log(error);
			} else {
				var newInfo = {
					cartTitle: drafts.cartTitle,
					cartDescription: drafts.cartDescription,
					groceryUser: drafts.groceryUser,
					groceryName: drafts.groceryName,
					groceryQuantity: drafts.groceryQuantity,
					groceryUnit: drafts.groceryUnit
				};
				Grocery.create(newInfo, (error, newPost) => {
					if (error) {
						console.log(error);
					} else {
						newPost.groceryUser.id = req.user.id;
						newPost.groceryUser.fullname = req.user.fullname;
						newPost.groceryUser.phone = req.user.phone;
						newPost.save();
						res.redirect('/buyer/posts/carts');
					}
				});
				Draft.findByIdAndRemove(req.params.id, (error, removeDraft) => {
					if (req.user.isShopkeeper) {
						if (error) {
							console.log(error);
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
app.get('/buyer/posts/carts', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper) {
		res.redirect('/shopkeeper');
	} else {
		Grocery.find({}, (error, postedCarts) => {
			if (error) {
				console.log(error);
			} else {
				res.render('postCarts', { currentUser: req.user, posted: postedCarts });
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
		Grocery.find({}, (error, groceries) => {
			if (error) throw error;
			else res.render('order', { currentUser: req.user, grocery: groceries.reverse() });
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
				res.redirect(`/shopkeeper/orders/${req.params.id}`);
			}
		});
	}
});
app.get('/shopkeeper/orders/incomplete', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.find({ isCompleted: false }, (error, grocery) => {
			if (error) throw error;
			else {
				res.render('order', { currentUser: req.user, grocery: grocery.reverse() });
			}
		});
	}
});
app.get('/shopkeeper/orders/complete', isLoggedIn, (req, res) => {
	if (req.user.isShopkeeper == false) {
		res.redirect('/buyer');
	} else {
		Grocery.find({ isCompleted: true }, (error, grocery) => {
			if (error) throw error;
			else {
				res.render('order', { currentUser: req.user, grocery: grocery.reverse() });
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
		phone: req.body.number
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
