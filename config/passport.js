var _ = require('underscore');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var StravaStrategy = require('passport-strava').Strategy;
var User = require('../models/User');
var secrets = require('./secrets');

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/**
 * Sign in using Email and Password.
 */

passport.use(new LocalStrategy({ usernameField: 'email' }, function(email, password, done) {
  User.findOne({ email: email }, function(err, user) {
    if (!user) return done(null, false, { message: 'Email ' + email + ' not found'});
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid email or password.' });
      }
    });
  });
}));

/**
 * Sign in with Strava.
 */

passport.use(new StravaStrategy(secrets.strava, function(req, accessToken, tokenSecret, profile, done) {
  if (req.user) {
    User.findOne({ strava: profile.id }, function(err, existingUser) {
      if (existingUser) {
        req.flash('errors', { msg: 'There is already a strava account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
        done(err);
      } else {
        User.findById(req.user.id, function(err, user) {
          user.strava = profile.id;
          user.tokens.push({ kind: 'strava', accessToken: accessToken, tokenSecret: tokenSecret });
          user.profile.name = user.profile.name || profile.displayName;
          user.profile.location = user.profile.location || profile._json.location;
          user.profile.picture = user.profile.picture || profile._json.profile_image_url;
          user.save(function(err) {
            req.flash('info', { msg: 'strava account has been linked.' });
            done(err, user);
          });
        });
      }
    });

  } else {
    User.findOne({ strava: profile.id }, function(err, existingUser) {
      if (existingUser) return done(null, existingUser);
      var user = new User();
      // strava will not provide an email address.  Period.
      // But a person’s strava username is guaranteed to be unique
      // so we can "fake" a strava email address as follows:
      user.email = profile.username + "@strava.com";
      user.strava = profile.id;
      user.tokens.push({ kind: 'strava', accessToken: accessToken, tokenSecret: tokenSecret });
      user.profile.name = profile.displayName;
      user.profile.location = profile._json.location;
      user.profile.picture = profile._json.profile_image_url;
      user.save(function(err) {
        done(err, user);
      });
    });
  }
}));

/**
 * Login Required middleware.
 */

exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */

exports.isAuthorized = function(req, res, next) {
  var provider = req.path.split('/').slice(-1)[0];
  if (_.findWhere(req.user.tokens, { kind: provider })) next();
  else res.redirect('/auth/' + provider);
};
