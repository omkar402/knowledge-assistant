const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // Conversation metadata
  title: {
    type: String,
    default: 'New Chat'
  },
  // Owner
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Knowledge base context
  knowledgeBase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  },
  // Team context (optional)
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  // Messages in conversation
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    // Citations for assistant messages
    citations: [{
      documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
      documentTitle: String,
      excerpt: String,
      pageNumber: Number,
      chunkIndex: Number,
      relevanceScore: Number
    }],
    // Metadata
    metadata: {
      model: String,
      tokensUsed: Number,
      processingTimeMs: Number,
      cached: Boolean
    },
    // Feedback
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      helpful: Boolean
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Chat settings (override knowledge base settings)
  settings: {
    model: String,
    temperature: Number,
    maxTokens: Number,
    systemPrompt: String
  },
  // Statistics
  stats: {
    messageCount: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    averageResponseTime: Number
  },
  // Sharing
  isShared: {
    type: Boolean,
    default: false
  },
  shareToken: String,
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
chatSchema.index({ user: 1, status: 1 });
chatSchema.index({ knowledgeBase: 1 });
chatSchema.index({ shareToken: 1 });
chatSchema.index({ createdAt: -1 });

// Auto-generate title from first message
chatSchema.methods.generateTitle = function() {
  const firstUserMessage = this.messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content;
    this.title = content.length > 50 
      ? content.substring(0, 50) + '...' 
      : content;
  }
};

// Add message helper
chatSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    metadata,
    timestamp: new Date()
  });
  this.stats.messageCount = this.messages.length;
};

// Get recent context for RAG
chatSchema.methods.getRecentContext = function(maxMessages = 10) {
  return this.messages
    .slice(-maxMessages)
    .map(m => ({
      role: m.role,
      content: m.content
    }));
};

module.exports = mongoose.model('Chat', chatSchema);
