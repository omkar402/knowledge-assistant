const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: '📚'
  },
  color: {
    type: String,
    default: '#3B82F6' // Blue
  },
  // Ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  // Documents in this knowledge base
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  // Access control
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit', 'admin'], default: 'view' }
  }],
  // AI Settings
  settings: {
    model: { type: String, default: 'gpt-4o-mini' },
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    maxTokens: { type: Number, default: 2000 },
    systemPrompt: String,
    citationStyle: { 
      type: String, 
      enum: ['inline', 'footnote', 'endnote'], 
      default: 'inline' 
    },
    enableSummarization: { type: Boolean, default: true },
    enableInsights: { type: Boolean, default: true }
  },
  // Statistics
  stats: {
    documentsCount: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
    totalQueries: { type: Number, default: 0 },
    totalTokensUsed: { type: Number, default: 0 },
    lastQueryAt: Date
  },
  // Caching
  cache: {
    enabled: { type: Boolean, default: true },
    ttlMinutes: { type: Number, default: 60 }
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
knowledgeBaseSchema.index({ owner: 1, status: 1 });
knowledgeBaseSchema.index({ team: 1 });
knowledgeBaseSchema.index({ name: 'text', description: 'text' });

// Update document count
knowledgeBaseSchema.methods.updateStats = async function() {
  const Document = mongoose.model('Document');
  const count = await Document.countDocuments({ 
    knowledgeBase: this._id, 
    status: 'active' 
  });
  this.stats.documentsCount = count;
  await this.save();
};

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
