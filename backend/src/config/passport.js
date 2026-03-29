const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const logger = require('./logger');

module.exports = function(passport) {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await User.findOne({ 
          $or: [
            { googleId: profile.id },
            { email: profile.emails[0].value }
          ]
        });

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          avatar: profile.photos[0]?.value,
          provider: 'google',
          isEmailVerified: true
        });

        logger.info(`New user registered via Google: ${user.email}`);
        done(null, user);
      } catch (error) {
        logger.error('Google OAuth error:', error);
        done(error, null);
      }
    }));
    logger.info('Google OAuth strategy configured');
  } else {
    logger.warn('Google OAuth not configured - missing credentials');
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Get primary email
        const email = profile.emails && profile.emails[0] 
          ? profile.emails[0].value 
          : `${profile.username}@github.local`;

        // Check if user exists
        let user = await User.findOne({ 
          $or: [
            { githubId: profile.id },
            { email: email }
          ]
        });

        if (user) {
          // Update GitHub ID if not set
          if (!user.githubId) {
            user.githubId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          githubId: profile.id,
          email: email,
          name: profile.displayName || profile.username,
          avatar: profile.photos[0]?.value,
          provider: 'github',
          isEmailVerified: !email.endsWith('@github.local')
        });

        logger.info(`New user registered via GitHub: ${user.email}`);
        done(null, user);
      } catch (error) {
        logger.error('GitHub OAuth error:', error);
        done(error, null);
      }
    }));
    logger.info('GitHub OAuth strategy configured');
  } else {
    logger.warn('GitHub OAuth not configured - missing credentials');
  }
};
