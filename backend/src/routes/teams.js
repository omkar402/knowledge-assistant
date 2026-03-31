const express = require('express');
const { authenticate } = require('../middleware/auth');
const Team = require('../models/Team');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/teams
 * @desc    Create a new team
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required.' });
    }

    const team = await Team.create({
      name,
      description,
      owner: req.userId,
      members: [{
        user: req.userId,
        role: 'owner',
        joinedAt: new Date()
      }]
    });

    // Add team to user
    await User.findByIdAndUpdate(req.userId, {
      $push: { teams: team._id }
    });

    logger.info(`Team created: ${team._id} by user ${req.userId}`);

    res.status(201).json({
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    logger.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team.' });
  }
});

/**
 * @route   GET /api/teams
 * @desc    Get user's teams
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const teams = await Team.find({
      'members.user': req.userId,
      status: 'active'
    }).populate('members.user', 'name email avatar');

    res.json({ teams });
  } catch (error) {
    logger.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

/**
 * @route   GET /api/teams/:id
 * @desc    Get single team
 * @access  Private (team member)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name email avatar')
      .populate('owner', 'name email avatar');

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    if (!team.isMember(req.userId)) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ team, role: team.getMemberRole(req.userId) });
  } catch (error) {
    logger.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team.' });
  }
});

/**
 * @route   PUT /api/teams/:id
 * @desc    Update team
 * @access  Private (owner/admin)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    if (!team.hasPermission(req.userId, ['owner', 'admin'])) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (settings) team.settings = { ...team.settings, ...settings };

    await team.save();

    res.json({
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    logger.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team.' });
  }
});

/**
 * @route   POST /api/teams/:id/invite
 * @desc    Invite member to team
 * @access  Private (owner/admin)
 */
router.post('/:id/invite', authenticate, async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    const canInvite = team.hasPermission(req.userId, ['owner', 'admin']) ||
      (team.settings.allowMemberInvites && team.isMember(req.userId));

    if (!canInvite) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Check if user exists
    const invitedUser = await User.findOne({ email: email.toLowerCase() });

    if (invitedUser) {
      // Check if already a member
      if (team.isMember(invitedUser._id)) {
        return res.status(400).json({ error: 'User is already a team member.' });
      }

      // Add directly if user exists
      team.members.push({
        user: invitedUser._id,
        role,
        joinedAt: new Date(),
        invitedBy: req.userId
      });
      team.usage.membersCount += 1;

      // Add team to user
      await User.findByIdAndUpdate(invitedUser._id, {
        $push: { teams: team._id }
      });

      await team.save();

      logger.info(`User ${invitedUser._id} added to team ${team._id}`);

      return res.json({
        message: `${email} has been added to the team`,
        member: {
          user: invitedUser.toPublicJSON(),
          role
        }
      });
    }

    // Create invitation for non-existing user
    const inviteToken = uuidv4();
    const existingInvite = team.invitations.find(i => i.email === email.toLowerCase());

    if (existingInvite) {
      return res.status(400).json({ error: 'Invitation already sent to this email.' });
    }

    team.invitations.push({
      email: email.toLowerCase(),
      role,
      token: inviteToken,
      invitedBy: req.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await team.save();

    // In production, send email with invite link
    logger.info(`Invitation sent to ${email} for team ${team._id}`);

    res.json({
      message: `Invitation sent to ${email}`,
      inviteToken // In production, this would be sent via email
    });
  } catch (error) {
    logger.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to send invitation.' });
  }
});

/**
 * @route   POST /api/teams/join/:token
 * @desc    Join team via invite token
 * @access  Private
 */
router.post('/join/:token', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({
      'invitations.token': req.params.token,
      status: 'active'
    });

    if (!team) {
      return res.status(404).json({ error: 'Invalid or expired invitation.' });
    }

    const invitation = team.invitations.find(i => i.token === req.params.token);

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired.' });
    }

    // Check if invitation email matches user
    if (invitation.email !== req.user.email.toLowerCase()) {
      return res.status(403).json({ 
        error: 'This invitation was sent to a different email address.' 
      });
    }

    // Check if already a member
    if (team.isMember(req.userId)) {
      return res.status(400).json({ error: 'You are already a team member.' });
    }

    // Add member
    team.members.push({
      user: req.userId,
      role: invitation.role,
      joinedAt: new Date(),
      invitedBy: invitation.invitedBy
    });
    team.usage.membersCount += 1;

    // Remove invitation
    team.invitations = team.invitations.filter(i => i.token !== req.params.token);

    await team.save();

    // Add team to user
    await User.findByIdAndUpdate(req.userId, {
      $push: { teams: team._id }
    });

    logger.info(`User ${req.userId} joined team ${team._id}`);

    res.json({
      message: 'Successfully joined the team',
      team: {
        id: team._id,
        name: team.name
      }
    });
  } catch (error) {
    logger.error('Join team error:', error);
    res.status(500).json({ error: 'Failed to join team.' });
  }
});

/**
 * @route   DELETE /api/teams/:id/members/:memberId
 * @desc    Remove member from team
 * @access  Private (owner/admin)
 */
router.delete('/:id/members/:memberId', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    // Can't remove owner
    if (team.owner.toString() === req.params.memberId) {
      return res.status(400).json({ error: 'Cannot remove team owner.' });
    }

    // Check permission (owner/admin can remove, members can remove themselves)
    const canRemove = 
      team.hasPermission(req.userId, ['owner', 'admin']) ||
      req.params.memberId === req.userId.toString();

    if (!canRemove) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Remove member
    team.members = team.members.filter(
      m => m.user.toString() !== req.params.memberId
    );
    team.usage.membersCount = team.members.length;

    await team.save();

    // Remove team from user
    await User.findByIdAndUpdate(req.params.memberId, {
      $pull: { teams: team._id }
    });

    logger.info(`Member ${req.params.memberId} removed from team ${team._id}`);

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    logger.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

/**
 * @route   PUT /api/teams/:id/members/:memberId/role
 * @desc    Update member role
 * @access  Private (owner/admin)
 */
router.put('/:id/members/:memberId/role', authenticate, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found.' });
    }

    if (!team.hasPermission(req.userId, ['owner', 'admin'])) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Can't change owner's role
    if (team.owner.toString() === req.params.memberId) {
      return res.status(400).json({ error: "Cannot change owner's role." });
    }

    const member = team.members.find(
      m => m.user.toString() === req.params.memberId
    );

    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    member.role = role;
    await team.save();

    res.json({
      message: 'Member role updated',
      member: {
        user: req.params.memberId,
        role
      }
    });
  } catch (error) {
    logger.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

/**
 * @route   DELETE /api/teams/:id
 * @desc    Delete team
 * @access  Private (owner only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.id,
      owner: req.userId
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found or access denied.' });
    }

    // Soft delete
    team.status = 'deleted';
    await team.save();

    // Remove team from all members
    await User.updateMany(
      { teams: team._id },
      { $pull: { teams: team._id } }
    );

    logger.info(`Team deleted: ${team._id}`);

    res.json({ message: 'Team deleted successfully.' });
  } catch (error) {
    logger.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team.' });
  }
});

module.exports = router;
