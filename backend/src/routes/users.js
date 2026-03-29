const express = require('express');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({ user: req.user.toPublicJSON() });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar, settings } = req.body;

    if (name) req.user.name = name;
    if (avatar) req.user.avatar = avatar;
    if (settings) {
      req.user.settings = { ...req.user.settings, ...settings };
    }

    await req.user.save();

    res.json({
      message: 'Profile updated successfully',
      user: req.user.toPublicJSON()
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

/**
 * @route   PUT /api/users/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Get user with password
    const user = await User.findById(req.userId).select('+password');

    if (!user.password) {
      return res.status(400).json({ 
        error: 'Cannot change password for OAuth accounts.' 
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

/**
 * @route   GET /api/users/usage
 * @desc    Get user usage stats
 * @access  Private
 */
router.get('/usage', authenticate, async (req, res) => {
  try {
    const Document = require('../models/Document');
    const Chat = require('../models/Chat');
    const KnowledgeBase = require('../models/KnowledgeBase');

    const [documentCount, chatCount, kbCount] = await Promise.all([
      Document.countDocuments({ owner: req.userId, status: 'active' }),
      Chat.countDocuments({ user: req.userId, status: 'active' }),
      KnowledgeBase.countDocuments({ owner: req.userId, status: 'active' })
    ]);

    // Plan limits
    const planLimits = {
      free: { documents: 50, storage: 100, queries: 100 },
      pro: { documents: 500, storage: 5000, queries: 1000 },
      team: { documents: 5000, storage: 50000, queries: 10000 }
    };

    const limits = planLimits[req.user.plan] || planLimits.free;

    res.json({
      usage: {
        ...req.user.usage,
        documentsCount: documentCount,
        chatsCount: chatCount,
        knowledgeBasesCount: kbCount
      },
      limits,
      plan: req.user.plan
    });
  } catch (error) {
    logger.error('Get usage error:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats.' });
  }
});

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password, confirmation } = req.body;

    if (confirmation !== 'DELETE') {
      return res.status(400).json({ 
        error: 'Please type DELETE to confirm account deletion.' 
      });
    }

    // For local accounts, verify password
    if (req.user.provider === 'local') {
      const user = await User.findById(req.userId).select('+password');
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Password is incorrect.' });
      }
    }

    // Soft delete - deactivate account
    req.user.isActive = false;
    req.user.email = `deleted_${Date.now()}_${req.user.email}`;
    await req.user.save();

    logger.info(`User account deactivated: ${req.userId}`);

    res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
});

module.exports = router;
