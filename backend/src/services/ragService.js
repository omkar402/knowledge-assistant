const { ChatOpenAI } = require('@langchain/openai');
const { InferenceClient } = require('@huggingface/inference');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence, RunnableLambda } = require('@langchain/core/runnables');
const vectorStore = require('./vectorStore');
const Document = require('../models/Document');
const logger = require('../config/logger');

/**
 * Create a LangChain LLM/chat-model.
 * Priority: ChatOpenAI (OpenAI API key present) → HuggingFaceInference (fallback).
 *
 * Note: ChatOpenAI is a BaseChatModel that accepts message arrays.
 *       HuggingFaceInference is a BaseLLM (completion model) that accepts a
 *       string — we convert the message array to a formatted string before
 *       invoking it (see _formatMessagesForHF).
 *
 * @param {Object} options
 * @returns {{ llm, provider: string, model: string }}
 */
// Models that require max_completion_tokens and do not support temperature/max_tokens
const OPENAI_COMPLETION_TOKENS_MODELS = new Set([
  'o1', 'o1-mini', 'o1-preview',
  'o3', 'o3-mini',
  'o4-mini',
  'gpt-5', 'gpt-5-mini',
]);

function isHuggingFaceModel(model) {
  return typeof model === 'string' && model.includes('/');
}

function createLLM(options = {}) {
  const { temperature = 0.7, maxTokens = 2000 } = options;
  const requestedModel = options.model;

  // Route to HuggingFace when the selected model is an HF model ID (contains '/')
  if (isHuggingFaceModel(requestedModel)) {
    const model = requestedModel;
    logger.info(`LLM provider: HuggingFace (${model})`);
    const hfClient = new InferenceClient(
      process.env.HUGGINGFACE_API_KEY,
      { provider: 'hf-inference' }   // pin to HF's own servers, not third-party
    );
    return {
      llm: null,       // not a LangChain LLM — use hfClient directly
      hfClient,
      provider: 'huggingface',
      model,
      temperature,
      maxTokens
    };
  }

  // OpenAI path
  if (process.env.OPENAI_API_KEY) {
    const model = requestedModel || 'gpt-4o-mini';
    logger.info(`LLM provider: OpenAI (${model})`);

    const usesCompletionTokens = OPENAI_COMPLETION_TOKENS_MODELS.has(model);
    const llmOptions = {
      model,
      openAIApiKey: process.env.OPENAI_API_KEY,
    };

    if (usesCompletionTokens) {
      llmOptions.maxCompletionTokens = maxTokens;
    } else {
      llmOptions.temperature = temperature;
      llmOptions.maxTokens = maxTokens;
    }

    return {
      llm: new ChatOpenAI(llmOptions),
      provider: 'openai',
      model
    };
  }

  const model = requestedModel || 'meta-llama/Llama-3.1-8B-Instruct';
  logger.info(`LLM provider: HuggingFace (${model})`);
  const hfClient = new InferenceClient(
    process.env.HUGGINGFACE_API_KEY,
    { provider: 'hf-inference' }
  );
  return {
    llm: null,
    hfClient,
    provider: 'huggingface',
    model,
    temperature,
    maxTokens
  };
}

async function _callHfChat(hfClient, model, messages, temperature, maxTokens) {
  const hfMessages = messages.map(m => {
    if (m instanceof SystemMessage) return { role: 'system',    content: m.content };
    if (m instanceof AIMessage)     return { role: 'assistant', content: m.content };
    return                                 { role: 'user',      content: m.content };
  });

  const result = await hfClient.chatCompletion({
    model,
    messages: hfMessages,
    max_tokens: maxTokens,
    temperature,
  });

  return result.choices[0]?.message?.content ?? '';
}



/**
 * RAG Service — Retrieval-Augmented Generation using LangChain.
 */
class RAGService {
  // ─── Main RAG query ────────────────────────────────────────────────────────

  /**
   * Answer a query using retrieved context + LLM.
   * @param {string} query
   * @param {Object} options
   */
  async query(query, options = {}) {
    const {
      knowledgeBaseId,
      userId,
      conversationHistory = [],
      model,
      temperature = 0.7,
      maxTokens = 2000,
      systemPrompt,
      citationStyle = 'inline'
    } = options;

    const startTime = Date.now();

    try {
      const { llm, hfClient, provider, model: resolvedModel } = createLLM({ model, temperature, maxTokens });

      //Retrieve relevant documents via LangChain retriever
      let searchResults = [];
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
      }
      //Build context string from retrieved results
      const context = this._buildContext(searchResults);
      // ── 3. Build LangChain message array ────────────────────────────────
      const messages = this._buildMessages(
        query, context, conversationHistory, systemPrompt, citationStyle
      );
      // Invoke LLM 
      let answer;
      if (provider === 'openai') {
        const chain = RunnableSequence.from([llm, new StringOutputParser()]);
        answer = await chain.invoke(messages);
      } else {
        answer = await _callHfChat(hfClient, resolvedModel, messages, temperature, maxTokens);
      }

      // Extract citations from search results for metadata (not necessarily cited in answer, but relevant to the response)
      const citations = await this._extractCitations(searchResults);

      return {
        answer,
        citations,
        metadata: {
          model: resolvedModel,
          provider,
          processingTimeMs: Date.now() - startTime,
          sourcesCount: searchResults.length,
          tokensUsed: null
        }
      };
    } catch (error) {
      logger.error('RAG query failed:', error);
      throw error;
    }
  }

  // ─── Summarisation ────────────────────────────────────────────────────────
  /**
   * Summarise document content.
   * @param {string} content
   * @param {Object} options
   */
  async summarize(content, options = {}) {
    const {
      maxLength = 500,
      model,
      style = 'concise' // 'concise' | 'detailed' | 'bullet-points'
    } = options;

    const { llm, hfClient, provider, model: resolvedModel, temperature: t, maxTokens: mt } = createLLM({ model, temperature: 0.5, maxTokens: maxLength * 2 });

    const styleMap = {
      concise: 'Provide a brief, concise summary in 2-3 paragraphs.',
      detailed: 'Provide a comprehensive summary covering all main points.',
      'bullet-points': 'Provide a summary using bullet points for key information.'
    };

    const systemMsg = new SystemMessage(`You are a helpful assistant that summarises content. ${styleMap[style] || styleMap.concise}`);
    const userMsg   = new HumanMessage(`Summarise the following content:\n\n${content.substring(0, 10000)}`);
    const msgs = [systemMsg, userMsg];

    if (provider === 'openai') {
      const chain = RunnableSequence.from([llm, new StringOutputParser()]);
      return chain.invoke(msgs);
    } else {
      return _callHfChat(hfClient, resolvedModel, msgs, t, mt);
    }
  }

  // ─── Insights ─────────────────────────────────────────────────────────────

  /**
   * Generate insights across multiple document contents.
   * @param {string[]} documents
   * @param {string|null} focusArea
   */
  async generateInsights(documents, focusArea = null) {
    const { llm, hfClient, provider, model: resolvedModel, temperature: t, maxTokens: mt } = createLLM({ temperature: 0.8 });

    const combinedContent = documents
      .map(doc => doc.substring(0, 3000))
      .join('\n\n---\n\n');

    const focusLine = focusArea
      ? ` Focus particularly on aspects related to: ${focusArea}.`
      : '';

    const userText =
      `Analyse the following documents and provide key insights, patterns, and notable findings.${focusLine}\n\n` +
      `Documents:\n${combinedContent}\n\n` +
      `Provide your analysis in a structured format with:\n` +
      `1. Key Themes\n2. Notable Insights\n3. Connections & Patterns\n4. Questions for Further Exploration`;

    const msgs = [
      new SystemMessage('You are a helpful research analyst that generates structured insights from documents.'),
      new HumanMessage(userText)
    ];

    if (provider === 'openai') {
      const chain = RunnableSequence.from([llm, new StringOutputParser()]);
      return chain.invoke(msgs);
    } else {
      return _callHfChat(hfClient, resolvedModel, msgs, t, mt);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────
  _buildContext(searchResults) {
    if (!searchResults?.length) return '';
    return searchResults
      .map((r, i) => `[${i + 1}] ${r.content}\n(Source: ${r.metadata?.title || 'Unknown'})`)
      .join('\n\n---\n\n');
  }

  _buildMessages(query, context, conversationHistory, systemPrompt, citationStyle) {
    const defaultSystem =
      `You are a knowledgeable research assistant with access to a curated knowledge base. ` +
      `Your role is to provide accurate, well-cited answers based on the provided context.\n\n` +
      `IMPORTANT GUIDELINES:\n` +
      `1. Base your answers primarily on the provided context.\n` +
      `2. Always cite your sources using ${citationStyle === 'inline' ? 'inline citations like [1], [2]' : 'numbered references'}.\n` +
      `3. If the context doesn't contain relevant information, clearly state that.\n` +
      `4. Be concise but thorough.\n` +
      `5. If you need to make inferences beyond the context, clearly indicate this.\n` +
      `6. Format your response with clear structure when appropriate.\n\n` +
      `Remember: Accuracy and proper citation are your top priorities.`;

    const messages = [new SystemMessage(systemPrompt || defaultSystem)];

    // Conversation history (last 10 turns)
    for (const msg of conversationHistory.slice(-10)) {
      if (msg.role === 'user') messages.push(new HumanMessage(msg.content));
      else if (msg.role === 'assistant') messages.push(new AIMessage(msg.content));
    }

    // Current question + retrieved context
    const userContent = context
      ? `Context from knowledge base:\n\n${context}\n\n---\n\nUser question: ${query}`
      : query;

    messages.push(new HumanMessage(userContent));
    return messages;
  }

  async _extractCitations(searchResults) {
    const citations = [];

    for (const result of searchResults) {
      const documentId = result.metadata?.documentId;
      let document;
      try {
        if (documentId) {
          document = await Document.findById(documentId).select('title type sourceUrl');
        }
      } catch {
        // Document may have been deleted
      }

      citations.push({
        documentId,
        documentTitle: document?.title || result.metadata?.title || 'Unknown',
        excerpt: result.content.substring(0, 200) + '...',
        chunkIndex: result.metadata?.chunkIndex,
        relevanceScore: result.score,
        sourceUrl: document?.sourceUrl || null
      });
    }

    return citations;
  }
}

module.exports = new RAGService();
