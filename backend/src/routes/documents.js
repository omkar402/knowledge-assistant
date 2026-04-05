const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload, getFileType } = require('../config/upload');
const Document = require('../models/Document');
const KnowledgeBase = require('../models/KnowledgeBase');
const documentProcessor = require('../services/documentProcessor');
const vectorStore = require('../services/vectorStore');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a document
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { knowledgeBaseId, title, description, tags } = req.body;
    const fileType = getFileType(req.file.mimetype, req.file.originalname);

    // Create document record
    const document = await Document.create({
      title: title || req.file.originalname,
      description,
      type: fileType,
      source: 'upload',
      file: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      },
      owner: req.userId,
      knowledgeBase: knowledgeBaseId || null,
      tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()) : []
    });

    // Process document asynchronously
    processDocumentAsync(document._id);

    // Update knowledge base if specified
    if (knowledgeBaseId) {
      await KnowledgeBase.findByIdAndUpdate(knowledgeBaseId, {
        $push: { documents: document._id },
        $inc: { 'stats.documentsCount': 1 }
      });
    }

    // Update user stats
    await req.user.updateOne({
      $inc: { 
        'usage.documentsCount': 1,
        'usage.storageUsedMB': req.file.size / (1024 * 1024)
      }
    });

    logger.info(`Document uploaded: ${document._id} by user ${req.userId}`);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document._id,
        title: document.title,
        type: document.type,
        status: document.embeddings.status,
        fileUrl: document.fileUrl
      }
    });
  } catch (error) {
    logger.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
});

/**
 * @route   POST /api/documents/url
 * @desc    Ingest a web page by URL
 * @access  Private
 */
router.post('/url', authenticate, async (req, res) => {
  try {
    const { url, knowledgeBaseId, title, tags } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    // Check if already ingested
    const existing = await Document.findOne({ 
      sourceUrl: url, 
      owner: req.userId,
      status: 'active'
    });
    
    if (existing) {
      return res.status(400).json({ 
        error: 'This URL has already been ingested.',
        documentId: existing._id
      });
    }

    // Create document record
    const document = await Document.create({
      title: title || 'Web Page',
      type: 'webpage',
      source: 'url',
      sourceUrl: url,
      owner: req.userId,
      knowledgeBase: knowledgeBaseId || null,
      tags: tags ? tags.split(',').map(t => t.trim().toLowerCase()) : [],
      isProcessing: true
    });

    // Process web page asynchronously
    processWebPageAsync(document._id, url);

    // Update knowledge base if specified
    if (knowledgeBaseId) {
      await KnowledgeBase.findByIdAndUpdate(knowledgeBaseId, {
        $push: { documents: document._id },
        $inc: { 'stats.documentsCount': 1 }
      });
    }

    res.status(201).json({
      message: 'Web page ingestion started',
      document: {
        id: document._id,
        title: document.title,
        url: document.sourceUrl,
        status: 'processing'
      }
    });
  } catch (error) {
    logger.error('URL ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest URL.' });
  }
});

/**
 * @route   GET /api/documents
 * @desc    Get all documents for user
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      knowledgeBaseId,
      type,
      status = 'active',
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { 
      owner: req.userId,
      status
    };

    if (knowledgeBaseId) query.knowledgeBase = knowledgeBaseId;
    if (type) query.type = type;
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [documents, total] = await Promise.all([
      Document.find(query)
        .select('-content.raw')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('knowledgeBase', 'name'),
      Document.countDocuments(query)
    ]);

    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Get single document
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.userId
    }).populate('knowledgeBase', 'name');

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Update view count
    document.stats.views += 1;
    document.stats.lastAccessedAt = new Date();
    await document.save();

    res.json({ document });
  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to fetch document.' });
  }
});

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { title, description, tags, knowledgeBaseId } = req.body;

    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.userId
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Update fields
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (tags) document.tags = tags.split(',').map(t => t.trim().toLowerCase());
    
    // Handle knowledge base change
    if (knowledgeBaseId !== undefined && knowledgeBaseId !== document.knowledgeBase?.toString()) {
      // Remove from old KB
      if (document.knowledgeBase) {
        await KnowledgeBase.findByIdAndUpdate(document.knowledgeBase, {
          $pull: { documents: document._id },
          $inc: { 'stats.documentsCount': -1 }
        });
      }
      // Add to new KB
      if (knowledgeBaseId) {
        await KnowledgeBase.findByIdAndUpdate(knowledgeBaseId, {
          $push: { documents: document._id },
          $inc: { 'stats.documentsCount': 1 }
        });
      }
      document.knowledgeBase = knowledgeBaseId || null;
    }

    await document.save();

    res.json({
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    logger.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document.' });
  }
});

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document (soft delete)
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.userId
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Soft delete
    document.status = 'deleted';
    await document.save();

    // Remove from knowledge base
    if (document.knowledgeBase) {
      await KnowledgeBase.findByIdAndUpdate(document.knowledgeBase, {
        $pull: { documents: document._id },
        $inc: { 'stats.documentsCount': -1 }
      });
    }

    // Delete vectors from vector store
    if (document.embeddings.vectorIds?.length > 0) {
      await vectorStore.deleteVectors(document.embeddings.vectorIds);
    }

    logger.info(`Document deleted: ${document._id}`);

    res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

/**
 * @route   POST /api/documents/:id/reprocess
 * @desc    Reprocess document embeddings
 * @access  Private
 */
router.post('/:id/reprocess', authenticate, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.userId
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Delete old vectors to avoid duplicates
    if (document.embeddings.vectorIds?.length > 0) {
      await vectorStore.deleteVectors(document.embeddings.vectorIds).catch(err =>
        logger.warn(`Could not delete old vectors for ${document._id}:`, err.message)
      );
    }

    // Reset embedding status
    document.embeddings.status = 'pending';
    document.embeddings.error = undefined;
    document.embeddings.vectorIds = [];
    document.isProcessing = true;
    await document.save();

    // Reprocess
    if (document.source === 'url') {
      processWebPageAsync(document._id, document.sourceUrl);
    } else {
      processDocumentAsync(document._id);
    }

    res.json({ 
      message: 'Document reprocessing started.',
      status: 'processing'
    });
  } catch (error) {
    logger.error('Reprocess document error:', error);
    res.status(500).json({ error: 'Failed to reprocess document.' });
  }
});

// ============================================
// Helper functions for async processing
// ============================================

// Helper to parse PDF date strings like D:20260316055603+00'00'
function parsePDFDate(pdfDate) {
  if (!pdfDate || typeof pdfDate !== 'string') return null;
  const match = pdfDate.match(/^D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [ , year, month, day, hour, min, sec ] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
}

async function processDocumentAsync(documentId) {
  try {
    const document = await Document.findById(documentId);
    if (!document) return;

    document.embeddings.status = 'processing';
    document.isProcessing = true;
    await document.save();

    // Extract text from file
    const result = await documentProcessor.processFile(
      document.file.path,
      document.type
    );

    // Update document with extracted content
    document.content.raw = result.raw;
    document.content.wordCount = result.wordCount;
    document.content.pageCount = result.pageCount;
    
    if (result.metadata) {
      // Convert PDF date strings to Date objects if present
      if (result.metadata.createdDate)
        result.metadata.createdDate = parsePDFDate(result.metadata.createdDate);
      if (result.metadata.modifiedDate)
        result.metadata.modifiedDate = parsePDFDate(result.metadata.modifiedDate);
      document.metadata = { ...document.metadata, ...result.metadata };
    }

    // Generate embeddings and store in vector store (splitIntoChunks is async — SemanticChunker)
    const chunks = await documentProcessor.splitIntoChunks(result.raw);
    const vectorIds = await vectorStore.addDocument(documentId, chunks, {
      title: document.title,
      type: document.type,
      ownerId: document.owner.toString()
    });

    document.embeddings.status = 'completed';
    document.embeddings.chunksCount = chunks.length;
    document.embeddings.vectorIds = vectorIds;
    document.embeddings.processedAt = new Date();
    document.embeddings.error = undefined;
    document.isProcessing = false;

    await document.save();
    logger.info(`Document processed successfully: ${documentId}`);
  } catch (error) {
    logger.error(`Document processing failed: ${documentId}`, error);
    
    const document = await Document.findById(documentId);
    if (document) {
      document.embeddings.status = 'failed';
      document.embeddings.error = error.message;
      document.isProcessing = false;
      await document.save();
    }
  }
}

async function processWebPageAsync(documentId, url) {
  try {
    const document = await Document.findById(documentId);
    if (!document) return;

    document.embeddings.status = 'processing';
    await document.save();

    // Fetch and parse web page
    const result = await documentProcessor.processWebPage(url);

    // Update document
    document.title = result.title || document.title;
    document.description = result.description || document.description;
    document.content.raw = result.raw;
    document.content.wordCount = result.wordCount;
    document.content.pageCount = 1;
    
    if (result.metadata) {
      document.metadata = { ...document.metadata, ...result.metadata };
    }

    // Generate embeddings (splitIntoChunks is async — SemanticChunker)
    const chunks = await documentProcessor.splitIntoChunks(result.raw);
    const vectorIds = await vectorStore.addDocument(documentId, chunks, {
      title: document.title,
      type: 'webpage',
      url: url,
      ownerId: document.owner.toString()
    });

    document.embeddings.status = 'completed';
    document.embeddings.chunksCount = chunks.length;
    document.embeddings.vectorIds = vectorIds;
    document.embeddings.processedAt = new Date();
    document.embeddings.error = undefined;
    document.isProcessing = false;

    await document.save();
    logger.info(`Web page processed successfully: ${documentId}`);
  } catch (error) {
    logger.error(`Web page processing failed: ${documentId}`, error);
    
    const document = await Document.findById(documentId);
    if (document) {
      document.embeddings.status = 'failed';
      document.embeddings.error = error.message;
      document.isProcessing = false;
      await document.save();
    }
  }
}

module.exports = router;
