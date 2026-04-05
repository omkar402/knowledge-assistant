const path = require('path');
const fs = require('fs').promises;
const xlsx = require('xlsx');
const logger = require('../config/logger');

// LangChain document loaders
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { DocxLoader } = require('@langchain/community/document_loaders/fs/docx');
const { CSVLoader } = require('@langchain/community/document_loaders/fs/csv');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { CheerioWebBaseLoader } = require('@langchain/community/document_loaders/web/cheerio');

// LangChain text splitters
// SemanticChunker is implemented below using @langchain/core embeddings.
// RecursiveCharacterTextSplitter is the fallback.
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

/**
 * Returns the embeddings instance to use for SemanticChunker.
 * Mirrors the same provider-selection logic as vectorStore so both
 * services stay in sync.
 */
function createEmbeddings() {
  if (process.env.OPENAI_API_KEY) {
    const { OpenAIEmbeddings } = require('@langchain/openai');
    return new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY
    });
  }
  if (process.env.HUGGINGFACE_API_KEY) {
    const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
    return new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: 'sentence-transformers/all-MiniLM-L6-v2'
    });
  }
  return null; // will fall back to RecursiveCharacterTextSplitter
}

// ─── Custom SemanticChunker ───────────────────────────────────────────────────
// Replicates LangChain's SemanticChunker algorithm using whatever embeddings
// provider is configured (OpenAI dim=1536 or HuggingFace dim=384).
//
// Algorithm:
//  1. Split text into individual sentences.
//  2. Embed each sentence via the provided LangChain Embeddings instance.
//  3. Compute cosine distance between each consecutive pair of sentence embeddings.
//  4. Find the N-th percentile distance as the breakpoint threshold.
//  5. Merge consecutive sentences into chunks, splitting wherever the distance
//     exceeds the threshold.

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

class SemanticChunker {
  /**
   * @param {import('@langchain/core/embeddings').Embeddings} embeddings
   * @param {{ breakpointThresholdType?: string, breakpointThresholdAmount?: number }} options
   */
  constructor(embeddings, options = {}) {
    this.embeddings = embeddings;
    // Percentile of distances to use as the split threshold (default 95th)
    this.percentile = options.breakpointThresholdAmount ?? 95;
  }

  async splitText(text) {
    // 1. Split into sentences (handles ., !, ?, newlines)
    const rawSentences = text
      .split(/(?<=[.!?])\s+|\n{2,}/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (rawSentences.length <= 1) return rawSentences;

    // 2. Embed all sentences in one batch call
    const vecs = await this.embeddings.embedDocuments(rawSentences);

    // 3. Cosine distances between consecutive embeddings
    const distances = [];
    for (let i = 0; i < vecs.length - 1; i++) {
      distances.push(1 - cosineSimilarity(vecs[i], vecs[i + 1]));
    }

    // 4. N-th percentile as threshold
    const sorted = [...distances].sort((a, b) => a - b);
    const pivotIdx = Math.min(
      Math.floor(sorted.length * (this.percentile / 100)),
      sorted.length - 1
    );
    const threshold = sorted[pivotIdx];

    // 5. Merge sentences into chunks
    const chunks = [];
    let current = rawSentences[0];
    for (let i = 0; i < distances.length; i++) {
      if (distances[i] >= threshold) {
        chunks.push(current);
        current = rawSentences[i + 1];
      } else {
        current += ' ' + rawSentences[i + 1];
      }
    }
    chunks.push(current);

    return chunks.filter(c => c.trim().length > 0);
  }
}

/**
 * Document Processor
 * - Loads files via LangChain document loaders (PDF, DOCX, CSV, TXT, web pages)
 * - Splits text using SemanticChunker (embedding-based sentence grouping)
 *   with automatic fallback to RecursiveCharacterTextSplitter when no
 *   embeddings API key is available.
 */
class DocumentProcessor {
  constructor() {
    this._splitter = null;
  }

  // ─── Lazy splitter initialisation ────────────────────────────────────────

  async _getSplitter() {
    if (this._splitter) return this._splitter;

    const embeddings = createEmbeddings();
    if (embeddings) {
      this._splitter = new SemanticChunker(embeddings, {
        // Group sentences that are semantically close; split at the 95th-percentile
        // distance boundary — keeps chunks meaningful without being too large.
        breakpointThresholdType: 'percentile',
        breakpointThresholdAmount: 95
      });
      logger.info('Text splitter: SemanticChunker (embedding-based)');
    } else {
      this._splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });
      logger.warn('No embeddings API key found — using RecursiveCharacterTextSplitter fallback');
    }

    return this._splitter;
  }

  // ─── Main entry point ────────────────────────────────────────────────────

  async processFile(filePath, fileType) {
    try {
      switch (fileType) {
        case 'pdf':      return await this.processPDF(filePath);
        case 'docx':     return await this.processDocx(filePath);
        case 'xlsx':     return await this.processXlsx(filePath);
        case 'pptx':     return await this.processPptx(filePath);
        case 'csv':      return await this.processCSV(filePath);
        case 'markdown':
        case 'text':
        case 'code':
        default:         return await this.processText(filePath);
      }
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
      throw error;
    }
  }

  // ─── Loaders ─────────────────────────────────────────────────────────────

  /**
   * PDF — LangChain PDFLoader (backed by pdf-parse).
   * Each page becomes a LangChain Document; we join them into one body of text.
   */
  async processPDF(filePath) {
    const loader = new PDFLoader(filePath); // splitPages: true by default
    const docs = await loader.load();
    const raw = docs.map(d => d.pageContent).join('\n\n');

    // Metadata lives under docs[0].metadata.pdf in community v0.3.x
    const pdfMeta = docs[0]?.metadata?.pdf || {};
    const pdfInfo = pdfMeta.info || {};

    return {
      raw,
      wordCount: this.countWords(raw),
      pageCount: pdfMeta.numpages || pdfMeta.totalPages || docs.length,
      metadata: {
        title: pdfInfo.Title || null,
        author: pdfInfo.Author || null,
        createdDate: pdfInfo.CreationDate || null,
        modifiedDate: pdfInfo.ModDate || null
      }
    };
  }

  /**
   * DOCX — LangChain DocxLoader (backed by mammoth).
   */
  async processDocx(filePath) {
    const loader = new DocxLoader(filePath);
    const docs = await loader.load();
    const raw = docs.map(d => d.pageContent).join('\n\n');

    return {
      raw,
      wordCount: this.countWords(raw),
      pageCount: Math.ceil(this.countWords(raw) / 500)
    };
  }

  /**
   * CSV — LangChain CSVLoader. Each row becomes its own Document; we join them.
   */
  async processCSV(filePath) {
    const loader = new CSVLoader(filePath);
    const docs = await loader.load();
    const raw = docs.map(d => d.pageContent).join('\n');

    return {
      raw,
      wordCount: this.countWords(raw),
      pageCount: 1
    };
  }

  /**
   * XLSX — No native LangChain loader; convert sheets to CSV text manually.
   */
  async processXlsx(filePath) {
    const workbook = xlsx.readFile(filePath);
    let fullText = '';
    const sheetNames = workbook.SheetNames;

    sheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      fullText += `\n--- Sheet: ${sheetName} ---\n${csv}`;
    });

    return {
      raw: fullText,
      wordCount: this.countWords(fullText),
      pageCount: sheetNames.length,
      metadata: { sheetNames, sheetsCount: sheetNames.length }
    };
  }

  /**
   * PPTX — officeparser not bundled; returns a placeholder.
   * Add the `officeparser` package and swap in PPTXLoader if needed.
   */
  async processPptx(filePath) {
    return {
      raw: '[PowerPoint content — install officeparser for full PPTX support]',
      wordCount: 0,
      pageCount: 0
    };
  }

  /**
   * Plain text / Markdown / source code — LangChain TextLoader.
   */
  async processText(filePath) {
    const loader = new TextLoader(filePath);
    const docs = await loader.load();
    const raw = docs.map(d => d.pageContent).join('\n');

    return {
      raw,
      wordCount: this.countWords(raw),
      pageCount: 1
    };
  }

  /**
   * Web page — LangChain CheerioWebBaseLoader.
   * Tries common content selectors; falls back to <body>.
   */
  async processWebPage(url) {
    const loader = new CheerioWebBaseLoader(url, {
      // Extract the first matching semantic content wrapper
      selector: 'article, main, .content, .post-content, .article-content, #content, .entry-content, body'
    });
    const docs = await loader.load();

    const raw = docs
      .map(d => d.pageContent)
      .join('\n\n')
      .replace(/\s+/g, ' ')
      .trim();

    const meta = docs[0]?.metadata || {};

    return {
      raw,
      title: meta.title || 'Untitled Page',
      description: meta.description || '',
      wordCount: this.countWords(raw),
      pageCount: 1,
      metadata: {
        url,
        domain: new URL(url).hostname
      }
    };
  }

  // ─── Semantic text splitter ───────────────────────────────────────────────

  /**
   * Split text into semantically coherent chunks using SemanticChunker.
   * Falls back to RecursiveCharacterTextSplitter when embeddings are unavailable.
   *
   * @param {string} text
   * @returns {Promise<string[]>}
   */
  async splitIntoChunks(text) {
    if (!text || text.trim().length === 0) return [];

    try {
      const splitter = await this._getSplitter();
      const chunks = await splitter.splitText(text);
      return chunks.filter(c => c.trim().length > 0);
    } catch (err) {
      logger.warn('Text splitting failed, using RecursiveCharacterTextSplitter fallback:', err.message);
      const fallback = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      });
      const chunks = await fallback.splitText(text);
      return chunks.filter(c => c.trim().length > 0);
    }
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
}

module.exports = new DocumentProcessor();

