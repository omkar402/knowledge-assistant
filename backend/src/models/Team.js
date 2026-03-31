const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  // Team owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Team members
  members: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true
    },
    role: { 
      type: String, 
      enum: ['owner', 'admin', 'member', 'viewer'], 
      default: 'member' 
    },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  // Pending invitations
  invitations: [{
    email: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    token: String,
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  // Team settings
  settings: {
    allowMemberInvites: { type: Boolean, default: false },
    defaultDocumentVisibility: { 
      type: String, 
      enum: ['private', 'team'], 
      default: 'team' 
    },
    defaultKnowledgeBaseVisibility: { 
      type: String, 
      enum: ['private', 'team'], 
      default: 'team' 
    }
  },
  // Usage and limits
  usage: {
    membersCount: { type: Number, default: 1 },
    documentsCount: { type: Number, default: 0 },
    knowledgeBasesCount: { type: Number, default: 0 },
    storageUsedMB: { type: Number, default: 0 }
  },
  limits: {
    maxMembers: { type: Number, default: 10 },
    maxDocuments: { type: Number, default: 1000 },
    maxStorageMB: { type: Number, default: 5000 }
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ 'invitations.email': 1 });
teamSchema.index({ 'invitations.token': 1 });

// Check if user is member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

// Get member role
teamSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Check if user has permission
teamSchema.methods.hasPermission = function(userId, requiredRoles) {
  const role = this.getMemberRole(userId);
  if (!role) return false;
  return requiredRoles.includes(role);
};

module.exports = mongoose.model('Team', teamSchema);
