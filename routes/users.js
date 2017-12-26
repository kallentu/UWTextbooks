var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var Book = require('../models/book');
var Setbook = require('../models/setbook');

/* GET register page*/
router.get('/register', function(req, res, next) {
    res.render('register', {
        title: 'UW Textbooks',
        errors: false
    });
});

/* POST user registration */
router.post('/register', function(req, res, next) {
    var name = req.body.name;
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    var password2 = req.body.password2;

    // Validation
    req.checkBody('name', 'Name is required').notEmpty();
    req.checkBody('email', 'Email is required').notEmpty();
    req.checkBody('email', 'Email must be in the format example@uwaterloo.ca').matches('@uwaterloo.ca');
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();
    req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if(errors){
        res.render('register',{
            title: 'UW Textbooks',
            errors: errors
        });
    } else {
        var newUser = new User({
            name: name,
            email: email,
            username: username,
            password: password
        });

        User.createUser(newUser, function(err, user){
            if(err) throw err;
            console.log(user);
        });

        req.flash('success_msg', 'You are registered and can now login');

        res.redirect('/users/login');
    }
});

passport.use(new LocalStrategy(
    function(username, password, done) {
        User.getUserByUsername(username, function(err, user){
            if(err) throw err;
            if(!user){
                return done(null, false, {message: 'Unknown User'});
            }

            User.comparePassword(password, user.password, function(err, isMatch){
                if(err) throw err;
                if(isMatch){
                    return done(null, user, {message: 'You are logged in!'});
                } else {
                    return done(null, false, {message: 'Invalid password'});
                }
            });
        });
    }));

// Starts user session
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.getUserById(id, function(err, user) {
        done(err, user);
    });
});

router.get('/login', function(req, res, next) {
    res.render('login', {
        title: 'UW Textbooks'
    })
});

// POST login page
router.post('/login',
    passport.authenticate('local', {failureRedirect:'/users/login', failureFlash: true}),
    function(req, res) {
        req.flash('success_msg', 'You are logged in!');
        res.redirect('/');

});

// GET logout page
router.get('/logout', ensureAuthenticated, function(req, res){
    req.logout();

    req.flash('success_msg', 'You are logged out');

    res.redirect('/users/login');
});


function getBooks(books){
    var newBooks = [];
    if (books.length > 0){
        console.log('hi1');

        books.forEach(function(book){
            var setbookID = book.setbookID;
            Setbook.findById(setbookID, 'title course', function (err, setbook){
                if (err) return handleError(err);

                var temp = {
                    title: setbook.title,
                    price: book.price,
                    description: book.description,
                    sold: book.sold,
                    setbookID: book.setbookID,
                    _id: book._id,
                    course: setbook.course
                };
                console.log('hi2');
                newBooks.push(temp);
            })
        });
    }
    return newBooks;
}


// GET dashboard page
router.get('/dashboard', ensureAuthenticated, function(req, res, next){
   var username = req.user.username;

    Book.find({username: username}).populate('setbookID').exec(function (err, books) {

            res.render('dashboard', {
                title: 'UW Textbooks',
                books: books,
                username: username
            })
    })
});

function ensureAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else {
        //req.flash('error_msg','You are not logged in');
        res.redirect('/users/login');
    }
}

module.exports = router;
