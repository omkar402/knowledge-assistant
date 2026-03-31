const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const { PromptTemplate } = require('@langchain/core/prompts');
const vectorStore = require('./vectorStore');
const Document = require('../models/Document');
const logger = require('../config/logger');

/**
 * RAG Service - Retrieval Augmented Generation for Q&A
 */
class RAGService {
  constructor() {
    this.llm = null;
  }

  /**
   * Initialize the LLM
   */
  initializeLLM(options = {}) {
    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 2000
    } = options;

    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: model,
      temperature,
      maxTokens
    });

    return this.llm;
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
      model = 'gpt-4o-mini',
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
      
      // Build messages
      const messages = this.buildMessages(
        query,
        context,
        conversationHistory,
        systemPrompt,
        citationStyle
      );

      // Generate response
      const response = await this.llm.invoke(messages);
      const answer = response.content;

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
          tokensUsed: response.usage_metadata?.total_tokens || null
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
   * Build messages array for LLM
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
      new SystemMessage(systemPrompt || defaultSystemPrompt)
    ];

    // Add conversation history
    for (const msg of conversationHistory.slice(-10)) { // Last 10 messages
      if (msg.role === 'user') {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        messages.push(new AIMessage(msg.content));
      }
    }

    // Add current query with context
    let userMessage = query;
    if (context) {
      userMessage = `Context from knowledge base:\n\n${context}\n\n---\n\nUser question: ${query}`;
    }

    messages.push(new HumanMessage(userMessage));

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
      model = 'gpt-4o-mini',
      style = 'concise' // concise, detailed, bullet-points
    } = options;

    this.initializeLLM({ model, temperature: 0.5, maxTokens: maxLength * 2 });

    const styleInstructions = {
      concise: 'Provide a brief, concise summary in 2-3 paragraphs.',
      detailed: 'Provide a comprehensive summary covering all main points.',
      'bullet-points': 'Provide a summary using bullet points for key information.'
    };

    const prompt = `Summarize the following content. ${styleInstructions[style]}

Content:
${content.substring(0, 10000)} // Limit input to avoid token limits

Summary:`;

    const response = await this.llm.invoke([new HumanMessage(prompt)]);
    return response.content;
  }

  /**
   * Generate insights from documents
   * @param {Array} documents - Array of document contents
   * @param {string} focusArea - Area to focus insights on
   */
  async generateInsights(documents, focusArea = null) {
    this.initializeLLM({ model: 'gpt-4o-mini', temperature: 0.8 });

    const combinedContent = documents
      .map(doc => doc.substring(0, 3000))
      .join('\n\n---\n\n');

    let prompt = `Analyze the following documents and provide key insights, patterns, and notable findings.`;
    
    if (focusArea) {
      prompt += ` Focus particularly on aspects related to: ${focusArea}`;
    }

    prompt += `\n\nDocuments:\n${combinedContent}\n\nProvide your analysis in a structured format with:\n1. Key Themes\n2. Notable Insights\n3. Connections & Patterns\n4. Questions for Further Exploration`;

    const response = await this.llm.invoke([new HumanMessage(prompt)]);
    return response.content;
  }
}

module.exports = new RAGService();
