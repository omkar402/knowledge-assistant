// const { ChatOpenAI } = require('@langchain/openai'); // OpenAI - commented out (switched to HuggingFace)
// const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages'); // Not needed for HuggingFace direct API
// const { PromptTemplate } = require('@langchain/core/prompts'); // Unused
const { HfInference } = require('@huggingface/inference');
const vectorStore = require('./vectorStore');
const Document = require('../models/Document');
const logger = require('../config/logger');

/**
 * RAG Service - Retrieval Augmented Generation for Q&A
 */
class RAGService {
  constructor() {
    // this.llm=null
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.llmConfig = {};
  }

  /**
   * Initialize the LLM config
   */
  initializeLLM(options = {}) {
    const {
      // model='gpt-4o-mini'
      model = 'meta-llama/Llama-3.1-8B-Instruct',
      temperature = 0.7,
      maxTokens = 2000
    } = options;
    // openAIApiKey: process.env.OPENAI_API_KEY, // OpenAI - commented out
    this.llmConfig = { model, temperature, maxNewTokens: maxTokens };
    return this.llmConfig;
  }

  /**
   * Invoke the HuggingFace model with a messages array (chat completion)
   */
  async invokeLLM(messages) {
    const result = await this.hf.chatCompletion({
      model: this.llmConfig.model || 'meta-llama/Llama-3.1-8B-Instruct',
      messages,
      temperature: this.llmConfig.temperature ?? 0.7,
      max_tokens: this.llmConfig.maxNewTokens ?? 2000
    });
    return result.choices[0].message.content;
  }

  /**
   * Process a query with RAG
   * @param {string} query - User query
   * @param {Object} options - Query options
   * @returns {Object} - Answer with citations
   */
  async query(query, options = {}) {
    const {
      knowledgeBaseId,
      userId,
      conversationHistory = [],
      model = 'meta-llama/Llama-3.1-8B-Instruct',
      temperature = 0.7,
      maxTokens = 2000,
      systemPrompt,
      citationStyle = 'inline'
    } = options;

    const startTime = Date.now();

    try {
      // Initialize LLM with options
      this.initializeLLM({ model, temperature, maxTokens });

      // Retrieve relevant documents
      let searchResults;
      if (knowledgeBaseId) {
        searchResults = await vectorStore.searchKnowledgeBase(query, knowledgeBaseId, {
          limit: 5,
          scoreThreshold: 0.3
        });
      } else if (userId) {
        searchResults = await vectorStore.searchUserDocuments(query, userId, {
          limit: 5,
          scoreThreshold: 0.3
        });
      } else {
        searchResults = [];
      }

      // Build context from search results
      const context = await this.buildContext(searchResults);
      
      // Build messages array for chat completion
      const messages = this.buildMessages(
        query,
        context,
        conversationHistory,
        systemPrompt,
        citationStyle
      );

      // Generate response via HuggingFace Inference API
      const answer = await this.invokeLLM(messages);

      // Extract and format citations
      const citations = await this.extractCitations(searchResults);

      const processingTime = Date.now() - startTime;

      return {
        answer,
        citations,
        metadata: {
          model,
          processingTimeMs: processingTime,
          sourcesCount: searchResults.length,
          tokensUsed: null // HuggingFace Inference API does not expose token usage
        }
      };
    } catch (error) {
      logger.error('RAG query failed:', error);
      throw error;
    }
  }

  /**
   * Build context from search results
   */
  async buildContext(searchResults) {
    if (!searchResults || searchResults.length === 0) {
      return '';
    }

    const contextParts = searchResults.map((result, index) => {
      const citation = `[${index + 1}]`;
      return `${citation} ${result.content}\n(Source: ${result.metadata.title || 'Unknown'})`;
    });

    return contextParts.join('\n\n---\n\n');
  }

  /**
   * Build a messages array for chat completion
   */
  buildMessages(query, context, conversationHistory, systemPrompt, citationStyle) {
    const defaultSystemPrompt = `You are a knowledgeable research assistant with access to a curated knowledge base. Your role is to provide accurate, well-cited answers based on the provided context.

IMPORTANT GUIDELINES:
1. Base your answers primarily on the provided context
2. Always cite your sources using ${citationStyle === 'inline' ? 'inline citations like [1], [2]' : 'numbered references'}
3. If the context doesn't contain relevant information, clearly state that
4. Be concise but thorough
5. If you need to make inferences beyond the context, clearly indicate this
6. Format your response with clear structure when appropriate

Remember: Accuracy and proper citation are your top priorities.`;

    const messages = [
      { role: 'system', content: systemPrompt || defaultSystemPrompt }
    ];

    // Add conversation history (last 10 messages)
    for (const msg of conversationHistory.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Append current query with context
    let userMessage = query;
    if (context) {
      userMessage = `Context from knowledge base:\n\n${context}\n\n---\n\nUser question: ${query}`;
    }
    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Extract citations from search results
   */
  async extractCitations(searchResults) {
    const citations = [];

    for (const result of searchResults) {
      const documentId = result.metadata.documentId;
      
      // Get document details
      let document;
      try {
        document = await Document.findById(documentId).select('title type sourceUrl');
      } catch (e) {
        // Document may have been deleted
      }

      citations.push({
        documentId,
        documentTitle: document?.title || result.metadata.title || 'Unknown',
        excerpt: result.content.substring(0, 200) + '...',
        chunkIndex: result.metadata.chunkIndex,
        relevanceScore: result.score,
        sourceUrl: document?.sourceUrl || null
      });
    }

    return citations;
  }

  /**
   * Generate a summary for a document
   * @param {string} content - Document content
   * @param {Object} options - Summary options
   */
  async summarize(content, options = {}) {
    const {
      maxLength = 500,
      model = 'meta-llama/Llama-3.1-8B-Instruct',
      style = 'concise' // concise, detailed, bullet-points
    } = options;

    this.initializeLLM({ model, temperature: 0.5, maxTokens: maxLength * 2 });

    const styleInstructions = {
      concise: 'Provide a brief, concise summary in 2-3 paragraphs.',
      detailed: 'Provide a comprehensive summary covering all main points.',
      'bullet-points': 'Provide a summary using bullet points for key information.'
    };

    const messages = [
      { role: 'system', content: `You are a helpful assistant that summarizes content. ${styleInstructions[style]}` },
      { role: 'user', content: `Summarize the following content:\n\n${content.substring(0, 10000)}` }
    ];

    return await this.invokeLLM(messages);
  }

  /**
   * Generate insights from documents
   * @param {Array} documents - Array of document contents
   * @param {string} focusArea - Area to focus insights on
   */
  async generateInsights(documents, focusArea = null) {
    this.initializeLLM({ model: 'meta-llama/Llama-3.1-8B-Instruct', temperature: 0.8 });

    const combinedContent = documents
      .map(doc => doc.substring(0, 3000))
      .join('\n\n---\n\n');

    let userPrompt = `Analyze the following documents and provide key insights, patterns, and notable findings.`;

    if (focusArea) {
      userPrompt += ` Focus particularly on aspects related to: ${focusArea}`;
    }

    userPrompt += `\n\nDocuments:\n${combinedContent}\n\nProvide your analysis in a structured format with:\n1. Key Themes\n2. Notable Insights\n3. Connections & Patterns\n4. Questions for Further Exploration`;

    const messages = [
      { role: 'system', content: 'You are a helpful research analyst that generates structured insights from documents.' },
      { role: 'user', content: userPrompt }
    ];

    return await this.invokeLLM(messages);
  }
}

module.exports = new RAGService();
