const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['pdf', 'webpage', 'docx', 'xlsx', 'pptx', 'markdown', 'text', 'code', 'other'],
    required: true
  },
  source: {
    type: String,
    enum: ['upload', 'url', 'api'],
    default: 'upload'
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  // File information
  file: {
    originalName: String,
    fileName: String,
    mimeType: String,
    size: Number, // in bytes
    path: String
  },
  // Content and processing
  content: {
    raw: { type: String, select: false }, // Raw extracted text (large, don't select by default)
    summary: String,
    wordCount: Number,
    pageCount: Number,
    language: { type: String, default: 'en' }
  },
  // Vector embeddings metadata
  embeddings: {
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'], 
      default: 'pending' 
    },
    chunksCount: { type: Number, default: 0 },
    vectorIds: [String], // IDs in vector store
    processedAt: Date,
    error: String
  },
  // Ownership and access
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  knowledgeBase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  // Sharing settings
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit'], default: 'view' }
  }],
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    author: String,
    createdDate: Date,
    modifiedDate: Date,
    custom: mongoose.Schema.Types.Mixed
  },
  // Analytics
  stats: {
    views: { type: Number, default: 0 },
    queries: { type: Number, default: 0 },
    citations: { type: Number, default: 0 },
    lastAccessedAt: Date
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
documentSchema.index({ owner: 1, status: 1 });
documentSchema.index({ knowledgeBase: 1 });
documentSchema.index({ team: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ 'embeddings.status': 1 });
documentSchema.index({ title: 'text', 'content.summary': 'text', tags: 'text' });

// Virtual for file URL
documentSchema.virtual('fileUrl').get(function() {
  if (this.file && this.file.fileName) {
    return `/uploads/${this.file.fileName}`;
  }
  return null;
});

// Transform output
documentSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Document', documentSchema);
