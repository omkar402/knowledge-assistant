const express = require('express');
const { authenticate } = require('../middleware/auth');
const KnowledgeBase = require('../models/KnowledgeBase');
const Document = require('../models/Document');
const vectorStore = require('../services/vectorStore');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/knowledge-base
 * @desc    Create a new knowledge base
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, icon, color, settings } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const knowledgeBase = await KnowledgeBase.create({
      name,
      description,
      icon: icon || '📚',
      color: color || '#3B82F6',
      owner: req.userId,
      settings: settings || {}
    });

    logger.info(`Knowledge base created: ${knowledgeBase._id} by user ${req.userId}`);

    res.status(201).json({
      message: 'Knowledge base created successfully',
      knowledgeBase
    });
  } catch (error) {
    logger.error('Create knowledge base error:', error);
    res.status(500).json({ error: 'Failed to create knowledge base.' });
  }
});

/**
 * @route   GET /api/knowledge-base
 * @desc    Get all knowledge bases for user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'active', includeShared = 'true' } = req.query;

    let query = { status };

    if (includeShared === 'true') {
      query.$or = [
        { owner: req.userId },
        { 'sharedWith.user': req.userId },
        { team: { $in: req.user.teams || [] } }
      ];
    } else {
      query.owner = req.userId;
    }

    const knowledgeBases = await KnowledgeBase.find(query)
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email avatar')
      .lean();

    // Add user's permission level
    const kbsWithPermission = knowledgeBases.map(kb => {
      let permission = 'view';
      if (kb.owner._id.toString() === req.userId.toString()) {
        permission = 'owner';
      } else {
        const share = kb.sharedWith?.find(s => s.user.toString() === req.userId.toString());
        permission = share?.permission || 'view';
      }
      return { ...kb, permission };
    });

    res.json({ knowledgeBases: kbsWithPermission });
  } catch (error) {
    logger.error('Get knowledge bases error:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge bases.' });
  }
});

/**
 * @route   GET /api/knowledge-base/:id
 * @desc    Get single knowledge base
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const knowledgeBase = await KnowledgeBase.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('documents', 'title type status embeddings.status createdAt');

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found.' });
    }

    // Check access
    const hasAccess = 
      knowledgeBase.owner._id.toString() === req.userId.toString() ||
      knowledgeBase.sharedWith?.some(s => s.user.toString() === req.userId.toString()) ||
      (knowledgeBase.team && req.user.teams?.includes(knowledgeBase.team));

    if (!hasAccess && knowledgeBase.visibility !== 'public') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ knowledgeBase });
  } catch (error) {
    logger.error('Get knowledge base error:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base.' });
  }
});

/**
 * @route   PUT /api/knowledge-base/:id
 * @desc    Update knowledge base
 * @access  Private (owner or admin)
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, icon, color, settings, visibility } = req.body;

    const knowledgeBase = await KnowledgeBase.findById(req.params.id);

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found.' });
    }

    // Check ownership
    if (knowledgeBase.owner.toString() !== req.userId.toString()) {
      const share = knowledgeBase.sharedWith?.find(
        s => s.user.toString() === req.userId.toString()
      );
      if (!share || share.permission !== 'admin') {
        return res.status(403).json({ error: 'Permission denied.' });
      }
    }

    // Update fields
    if (name) knowledgeBase.name = name;
    if (description !== undefined) knowledgeBase.description = description;
    if (icon) knowledgeBase.icon = icon;
    if (color) knowledgeBase.color = color;
    if (visibility) knowledgeBase.visibility = visibility;
    if (settings) {
      knowledgeBase.settings = { ...knowledgeBase.settings, ...settings };
    }

    await knowledgeBase.save();

    res.json({
      message: 'Knowledge base updated successfully',
      knowledgeBase
    });
  } catch (error) {
    logger.error('Update knowledge base error:', error);
    res.status(500).json({ error: 'Failed to update knowledge base.' });
  }
});

/**
 * @route   DELETE /api/knowledge-base/:id
 * @desc    Delete knowledge base
 * @access  Private (owner only)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const knowledgeBase = await KnowledgeBase.findOne({
      _id: req.params.id,
      owner: req.userId
    });

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found or access denied.' });
    }

    // Soft delete
    knowledgeBase.status = 'deleted';
    await knowledgeBase.save();

    // Optionally: Remove KB reference from documents
    await Document.updateMany(
      { knowledgeBase: knowledgeBase._id },
      { $unset: { knowledgeBase: '' } }
    );

    logger.info(`Knowledge base deleted: ${knowledgeBase._id}`);

    res.json({ message: 'Knowledge base deleted successfully.' });
  } catch (error) {
    logger.error('Delete knowledge base error:', error);
    res.status(500).json({ error: 'Failed to delete knowledge base.' });
  }
});

/**
 * @route   POST /api/knowledge-base/:id/share
 * @desc    Share knowledge base with user
 * @access  Private (owner or admin)
 */
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const { email, permission = 'view' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const knowledgeBase = await KnowledgeBase.findById(req.params.id);

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found.' });
    }

    // Check permission
    if (knowledgeBase.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only owner can share.' });
    }

    // Find user to share with
    const User = require('../models/User');
    const userToShare = await User.findOne({ email: email.toLowerCase() });

    if (!userToShare) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (userToShare._id.toString() === req.userId.toString()) {
      return res.status(400).json({ error: 'Cannot share with yourself.' });
    }

    // Check if already shared
    const existingShare = knowledgeBase.sharedWith?.find(
      s => s.user.toString() === userToShare._id.toString()
    );

    if (existingShare) {
      existingShare.permission = permission;
    } else {
      knowledgeBase.sharedWith.push({
        user: userToShare._id,
        permission
      });
    }

    await knowledgeBase.save();

    res.json({
      message: `Knowledge base shared with ${email}`,
      sharedWith: {
        user: userToShare.toPublicJSON(),
        permission
      }
    });
  } catch (error) {
    logger.error('Share knowledge base error:', error);
    res.status(500).json({ error: 'Failed to share knowledge base.' });
  }
});

/**
 * @route   DELETE /api/knowledge-base/:id/share/:userId
 * @desc    Remove share access
 * @access  Private (owner)
 */
router.delete('/:id/share/:shareUserId', authenticate, async (req, res) => {
  try {
    const knowledgeBase = await KnowledgeBase.findOne({
      _id: req.params.id,
      owner: req.userId
    });

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found or access denied.' });
    }

    knowledgeBase.sharedWith = knowledgeBase.sharedWith.filter(
      s => s.user.toString() !== req.params.shareUserId
    );

    await knowledgeBase.save();

    res.json({ message: 'Share access removed.' });
  } catch (error) {
    logger.error('Remove share error:', error);
    res.status(500).json({ error: 'Failed to remove share access.' });
  }
});

/**
 * @route   GET /api/knowledge-base/:id/search
 * @desc    Search within knowledge base
 * @access  Private
 */
router.get('/:id/search', authenticate, async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    // Verify access to knowledge base
    const knowledgeBase = await KnowledgeBase.findById(req.params.id);
    
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found.' });
    }

    const results = await vectorStore.searchKnowledgeBase(query, req.params.id, {
      limit: parseInt(limit),
      scoreThreshold: 0.3
    });

    // Enrich with document info
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const doc = await Document.findById(result.metadata.documentId)
          .select('title type sourceUrl');
        return {
          ...result,
          document: doc
        };
      })
    );

    res.json({
      query,
      results: enrichedResults,
      count: enrichedResults.length
    });
  } catch (error) {
    logger.error('Knowledge base search error:', error);
    res.status(500).json({ error: 'Search failed.' });
  }
});

/**
 * @route   GET /api/knowledge-base/:id/stats
 * @desc    Get knowledge base statistics
 * @access  Private
 */
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    const knowledgeBase = await KnowledgeBase.findById(req.params.id);

    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found.' });
    }

    // Get document stats
    const documentStats = await Document.aggregate([
      { $match: { knowledgeBase: knowledgeBase._id, status: 'active' } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalWords: { $sum: '$content.wordCount' },
          totalChunks: { $sum: '$embeddings.chunksCount' },
          types: { $push: '$type' }
        }
      }
    ]);

    const stats = documentStats[0] || {
      totalDocuments: 0,
      totalWords: 0,
      totalChunks: 0,
      types: []
    };

    // Count document types
    const typeCounts = {};
    stats.types.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    res.json({
      stats: {
        ...knowledgeBase.stats,
        totalDocuments: stats.totalDocuments,
        totalWords: stats.totalWords,
        totalChunks: stats.totalChunks,
        documentTypes: typeCounts
      }
    });
  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

module.exports = router;
