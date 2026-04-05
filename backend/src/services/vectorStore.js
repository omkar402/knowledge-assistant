const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

function createEmbeddings() {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAIEmbeddings } = require('@langchain/openai');
    logger.info('Embeddings provider: OpenAI (text-embedding-3-small, dim=1536)');
    return new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }

  if (process.env.HUGGINGFACE_API_KEY) {
    const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
    logger.info('Embeddings provider: HuggingFace (all-MiniLM-L6-v2, dim=384)');
    return new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: 'sentence-transformers/all-MiniLM-L6-v2'
    });
  }

  throw new Error(
    'No embedding provider configured. Set OPENAI_API_KEY (preferred) or HUGGINGFACE_API_KEY.'
  );
}

class VectorStoreService {
  constructor() {
    this.embeddings = null;
    this.vectorStore = null;
    this.collectionName = process.env.CHROMA_COLLECTION_NAME || 'knowledge_base';
  }

  async initialize() {
    if (this.vectorStore) return this.vectorStore;

    if (!process.env.OPENAI_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
      logger.warn('No embedding API key set — vector store disabled');
      return null;
    }

    try {
      this.embeddings = createEmbeddings();

      this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
        collectionName: this.collectionName,
        url: process.env.CHROMA_URL || 'http://localhost:8000',
        collectionMetadata: { 'hnsw:space': 'cosine' }
      }).catch(async () => {
        logger.info('Chroma collection not found — creating new one');
        return new Chroma(this.embeddings, {
          collectionName: this.collectionName,
          url: process.env.CHROMA_URL || 'http://localhost:8000',
          collectionMetadata: { 'hnsw:space': 'cosine' }
        });
      });

      logger.info(`Vector store initialised (collection: ${this.collectionName})`);
      return this.vectorStore;
    } catch (error) {
      logger.error('Failed to initialise vector store:', error);
      return null;
    }
  }

  /**
   * Return a LangChain VectorStoreRetriever for use in LCEL chains.
   * @param {Object} options
   * @param {number}  options.k             - Number of docs to retrieve (default 5)
   * @param {Object}  options.filter        - Chroma metadata filter
   * @param {number}  options.scoreThreshold - Minimum similarity score (0–1)
   */
  async getRetriever(options = {}) {
    const store = await this.initialize();
    if (!store) return null;

    const { k = 5, filter = {}, scoreThreshold } = options;

    const retrieverOptions = { k };
    if (Object.keys(filter).length > 0) retrieverOptions.filter = filter;
    if (scoreThreshold !== undefined) {
      retrieverOptions.searchType = 'similarity_score_threshold';
      retrieverOptions.searchKwargs = { score_threshold: scoreThreshold };
    }

    return store.asRetriever(retrieverOptions);
  }

  async addDocument(documentId, chunks, metadata = {}) {
    const store = await this.initialize();
    if (!store) {
      logger.warn(`Vector store unavailable - skipping embedding for document ${documentId}`);
      return [];
    }

    try {
      const ids = [];
      const vectorIds = [];

      chunks.forEach((_, index) => {
        const vectorId = `${documentId}_${index}_${uuidv4().slice(0, 8)}`;
        vectorIds.push(vectorId);
        ids.push(vectorId);
      });

      await store.addDocuments(
        chunks.map((chunk, i) => ({
          pageContent: chunk,
          metadata: {
            documentId: documentId.toString(),
            chunkIndex: i,
            totalChunks: chunks.length,
            ...metadata
          }
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

  async search(query, options = {}) {
    const store = await this.initialize();
    if (!store) {
      logger.warn('Vector search unavailable - returning empty results');
      return [];
    }

    const { limit = 5, filter = {}, scoreThreshold = 0.5 } = options;

    try {
      const results = await store.similaritySearchWithScore(query, limit, filter);
      return results
        .filter(([_, score]) => score >= scoreThreshold)
        .map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          score
        }));
    } catch (error) {
      logger.error('Vector search failed:', error);
      return [];
    }
  }

  async searchKnowledgeBase(query, knowledgeBaseId, options = {}) {
    return this.search(query, {
      ...options,
      filter: { knowledgeBaseId: knowledgeBaseId.toString() }
    });
  }

  async searchUserDocuments(query, userId, options = {}) {
    return this.search(query, {
      ...options,
      filter: { ownerId: userId.toString() }
    });
  }

  async deleteVectors(vectorIds) {
    const store = await this.initialize();
    if (!store || !vectorIds?.length) return;

    try {
      await store.delete({ ids: vectorIds });
      logger.info(`Deleted ${vectorIds.length} vectors`);
    } catch (error) {
      logger.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  async deleteDocumentVectors(documentId) {
    const store = await this.initialize();
    if (!store) return;

    try {
      await store.delete({ filter: { documentId: documentId.toString() } });
      logger.info(`Deleted all vectors for document ${documentId}`);
    } catch (error) {
      logger.error(`Failed to delete vectors for document ${documentId}:`, error);
      throw error;
    }
  }

  async getStats() {
    const store = await this.initialize();
    if (!store) return { vectorStoreEnabled: false };

    try {
      const count = await store.collection.count();
      return { collectionName: this.collectionName, totalVectors: count, vectorStoreEnabled: true };
    } catch (error) {
      logger.error('Failed to get vector store stats:', error);
      return { error: error.message };
    }
  }
}

module.exports = new VectorStoreService();

