const express = require('express');
const { authenticate } = require('../middleware/auth');
const Chat = require('../models/Chat');
const KnowledgeBase = require('../models/KnowledgeBase');
const ragService = require('../services/ragService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/chat/query
 * @desc    Send a query and get AI response with citations
 * @access  Private
 */
router.post('/query', authenticate, async (req, res) => {
  try {
    const { 
      query, 
      chatId, 
      knowledgeBaseId,
      settings = {}
    } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    // Get or create chat
    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, user: req.userId });
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found.' });
      }
    } else {
      chat = await Chat.create({
        user: req.userId,
        knowledgeBase: knowledgeBaseId || null
      });
    }

    // Get knowledge base settings if applicable
    let kbSettings = {};
    if (chat.knowledgeBase || knowledgeBaseId) {
      const kb = await KnowledgeBase.findById(chat.knowledgeBase || knowledgeBaseId);
      if (kb) {
        kbSettings = kb.settings || {};
        chat.knowledgeBase = kb._id;
      }
    }

    // Merge settings (request > chat > knowledge base > defaults)
    const mergedSettings = {
      model: settings.model || chat.settings?.model || kbSettings.model || 'meta-llama/Llama-3.1-8B-Instruct',
      temperature: settings.temperature ?? chat.settings?.temperature ?? kbSettings.temperature ?? 0.7,
      maxTokens: settings.maxTokens || chat.settings?.maxTokens || kbSettings.maxTokens || 2000,
      systemPrompt: settings.systemPrompt || chat.settings?.systemPrompt || kbSettings.systemPrompt,
      citationStyle: settings.citationStyle || kbSettings.citationStyle || 'inline'
    };

    // Add user message to chat
    chat.addMessage('user', query);

    // Get conversation history for context
    const conversationHistory = chat.getRecentContext(10);

    // Process query with RAG
    const result = await ragService.query(query, {
      knowledgeBaseId: chat.knowledgeBase,
      userId: req.userId,
      conversationHistory: conversationHistory.slice(0, -1), // Exclude current query
      ...mergedSettings
    });

    // Add assistant response to chat
    chat.messages.push({
      role: 'assistant',
      content: result.answer,
      citations: result.citations,
      metadata: result.metadata
    });

    // Update stats
    chat.stats.messageCount = chat.messages.length;
    chat.stats.totalTokens += result.metadata.tokensUsed || 0;

    // Generate title if first exchange
    if (chat.messages.length === 2) {
      chat.generateTitle();
    }

    await chat.save();

    // Update knowledge base stats
    if (chat.knowledgeBase) {
      await KnowledgeBase.findByIdAndUpdate(chat.knowledgeBase, {
        $inc: { 
          'stats.totalQueries': 1,
          'stats.totalTokensUsed': result.metadata.tokensUsed || 0
        },
        $set: { 'stats.lastQueryAt': new Date() }
      });
    }

    // Update user stats
    await req.user.updateOne({
      $inc: { 'usage.queriesCount': 1 },
      $set: { 'usage.lastQueryAt': new Date() }
    });

    res.json({
      chatId: chat._id,
      answer: result.answer,
      citations: result.citations,
      metadata: result.metadata
    });
  } catch (error) {
    logger.error('Chat query error:', error);
    res.status(500).json({ error: 'Failed to process query.' });
  }
});

/**
 * @route   GET /api/chat
 * @desc    Get all chats for user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      knowledgeBaseId,
      status = 'active'
    } = req.query;

    const query = { 
      user: req.userId,
      status
    };

    if (knowledgeBaseId) query.knowledgeBase = knowledgeBaseId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [chats, total] = await Promise.all([
      Chat.find(query)
        .select('title knowledgeBase stats createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('knowledgeBase', 'name icon'),
      Chat.countDocuments(query)
    ]);

    res.json({
      chats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats.' });
  }
});

/**
 * @route   GET /api/chat/:id
 * @desc    Get single chat with messages
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.userId
    }).populate('knowledgeBase', 'name icon settings');

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    res.json({ chat });
  } catch (error) {
    logger.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to fetch chat.' });
  }
});

/**
 * @route   PUT /api/chat/:id
 * @desc    Update chat (title, settings)
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, settings } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    if (title) chat.title = title;
    if (settings) chat.settings = { ...chat.settings, ...settings };

    await chat.save();

    res.json({
      message: 'Chat updated successfully',
      chat: {
        id: chat._id,
        title: chat.title,
        settings: chat.settings
      }
    });
  } catch (error) {
    logger.error('Update chat error:', error);
    res.status(500).json({ error: 'Failed to update chat.' });
  }
});

/**
 * @route   DELETE /api/chat/:id
 * @desc    Delete chat
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    chat.status = 'deleted';
    await chat.save();

    res.json({ message: 'Chat deleted successfully.' });
  } catch (error) {
    logger.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat.' });
  }
});

/**
 * @route   POST /api/chat/:id/feedback
 * @desc    Add feedback to a message
 * @access  Private
 */
router.post('/:id/feedback', authenticate, async (req, res) => {
  try {
    const { messageIndex, rating, helpful, comment } = req.body;

    const chat = await Chat.findOne({
      _id: req.params.id,
      user: req.userId
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    if (messageIndex < 0 || messageIndex >= chat.messages.length) {
      return res.status(400).json({ error: 'Invalid message index.' });
    }

    chat.messages[messageIndex].feedback = {
      rating,
      helpful,
      comment
    };

    await chat.save();

    res.json({ message: 'Feedback added successfully.' });
  } catch (error) {
    logger.error('Add feedback error:', error);
    res.status(500).json({ error: 'Failed to add feedback.' });
  }
});

/**
 * @route   POST /api/chat/summarize
 * @desc    Summarize document content
 * @access  Private
 */
router.post('/summarize', authenticate, async (req, res) => {
  try {
    const { content, documentId, style = 'concise' } = req.body;

    if (!content && !documentId) {
      return res.status(400).json({ error: 'Content or document ID required.' });
    }

    let textToSummarize = content;

    if (documentId) {
      const Document = require('../models/Document');
      const doc = await Document.findOne({
        _id: documentId,
        owner: req.userId
      }).select('+content.raw');

      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      textToSummarize = doc.content.raw;
    }

    const summary = await ragService.summarize(textToSummarize, { style });

    res.json({ summary, style });
  } catch (error) {
    logger.error('Summarize error:', error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

/**
 * @route   POST /api/chat/insights
 * @desc    Generate insights from knowledge base
 * @access  Private
 */
router.post('/insights', authenticate, async (req, res) => {
  try {
    const { knowledgeBaseId, documentIds, focusArea } = req.body;

    const Document = require('../models/Document');
    let query = { owner: req.userId, status: 'active' };

    if (knowledgeBaseId) {
      query.knowledgeBase = knowledgeBaseId;
    } else if (documentIds?.length > 0) {
      query._id = { $in: documentIds };
    } else {
      return res.status(400).json({ error: 'Knowledge base ID or document IDs required.' });
    }

    const documents = await Document.find(query)
      .select('+content.raw')
      .limit(10); // Limit for token management

    if (documents.length === 0) {
      return res.status(404).json({ error: 'No documents found.' });
    }

    const contents = documents.map(doc => doc.content.raw).filter(Boolean);
    const insights = await ragService.generateInsights(contents, focusArea);

    res.json({ 
      insights,
      documentsAnalyzed: documents.length,
      focusArea
    });
  } catch (error) {
    logger.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights.' });
  }
});

module.exports = router;
