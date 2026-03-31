const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Vector Store Service - Manages document embeddings with Chroma
 */
class VectorStoreService {
  constructor() {
    this.embeddings = null;
    this.vectorStore = null;
    this.collectionName = process.env.CHROMA_COLLECTION_NAME || 'knowledge_base';
    this.persistDirectory = process.env.CHROMA_PERSIST_DIRECTORY || './data/chroma';
  }

  /**
   * Initialize the vector store
   */
  async initialize() {
    if (this.vectorStore) return this.vectorStore;

    try {
      // Initialize OpenAI embeddings
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small' // Cost-effective embedding model
      });

      // Initialize or load existing Chroma collection
      this.vectorStore = await Chroma.fromExistingCollection(
        this.embeddings,
        {
          collectionName: this.collectionName,
          url: process.env.CHROMA_URL || 'http://localhost:8000',
          collectionMetadata: {
            'hnsw:space': 'cosine'
          }
        }
      ).catch(async () => {
        // Collection doesn't exist, create new one
        logger.info('Creating new Chroma collection');
        return new Chroma(this.embeddings, {
          collectionName: this.collectionName,
          url: process.env.CHROMA_URL || 'http://localhost:8000'
        });
      });

      logger.info('Vector store initialized successfully');
      return this.vectorStore;
    } catch (error) {
      logger.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  /**
   * Add document chunks to vector store
   * @param {string} documentId - Document ID
   * @param {Array<string>} chunks - Text chunks
   * @param {Object} metadata - Document metadata
   * @returns {Array<string>} - Vector IDs
   */
  async addDocument(documentId, chunks, metadata = {}) {
    await this.initialize();

    try {
      const vectorIds = [];
      const documents = [];
      const metadatas = [];
      const ids = [];

      chunks.forEach((chunk, index) => {
        const vectorId = `${documentId}_${index}_${uuidv4().slice(0, 8)}`;
        vectorIds.push(vectorId);
        documents.push(chunk);
        ids.push(vectorId);
        metadatas.push({
          documentId: documentId.toString(),
          chunkIndex: index,
          totalChunks: chunks.length,
          ...metadata
        });
      });

      // Add documents to Chroma
      await this.vectorStore.addDocuments(
        documents.map((doc, i) => ({
          pageContent: doc,
          metadata: metadatas[i]
        })),
        { ids }
      );

      logger.info(`Added ${chunks.length} chunks for document ${documentId}`);
      return vectorIds;
    } catch (error) {
      logger.error(`Failed to add document ${documentId} to vector store:`, error);
      throw error;
    }
  }

  /**
   * Search for similar documents
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} - Similar documents with scores
   */
  async search(query, options = {}) {
    await this.initialize();

    const {
      limit = 5,
      filter = {},
      scoreThreshold = 0.5
    } = options;

    try {
      const results = await this.vectorStore.similaritySearchWithScore(
        query,
        limit,
        filter
      );

      // Filter by score threshold and format results
      return results
        .filter(([_, score]) => score >= scoreThreshold)
        .map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          score: score
        }));
    } catch (error) {
      logger.error('Vector search failed:', error);
      throw error;
    }
  }

  /**
   * Search within specific knowledge base
   * @param {string} query - Search query
   * @param {string} knowledgeBaseId - Knowledge base ID
   * @param {Object} options - Search options
   */
  async searchKnowledgeBase(query, knowledgeBaseId, options = {}) {
    const filter = {
      knowledgeBaseId: knowledgeBaseId.toString()
    };

    return this.search(query, { ...options, filter });
  }

  /**
   * Search across user's documents
   * @param {string} query - Search query
   * @param {string} userId - User ID
   * @param {Object} options - Search options
   */
  async searchUserDocuments(query, userId, options = {}) {
    const filter = {
      ownerId: userId.toString()
    };

    return this.search(query, { ...options, filter });
  }

  /**
   * Delete vectors for a document
   * @param {Array<string>} vectorIds - Vector IDs to delete
   */
  async deleteVectors(vectorIds) {
    await this.initialize();

    try {
      if (vectorIds && vectorIds.length > 0) {
        await this.vectorStore.delete({ ids: vectorIds });
        logger.info(`Deleted ${vectorIds.length} vectors`);
      }
    } catch (error) {
      logger.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  /**
   * Delete all vectors for a document
   * @param {string} documentId - Document ID
   */
  async deleteDocumentVectors(documentId) {
    await this.initialize();

    try {
      // Delete by filter
      await this.vectorStore.delete({
        filter: { documentId: documentId.toString() }
      });
      logger.info(`Deleted all vectors for document ${documentId}`);
    } catch (error) {
      logger.error(`Failed to delete vectors for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    await this.initialize();

    try {
      const count = await this.vectorStore.collection.count();
      return {
        collectionName: this.collectionName,
        totalVectors: count
      };
    } catch (error) {
      logger.error('Failed to get vector store stats:', error);
      return { error: error.message };
    }
  }
}

module.exports = new VectorStoreService();
