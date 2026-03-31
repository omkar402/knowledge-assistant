const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../config/logger');

/**
 * Document Processor - Extracts text from various file types
 */
class DocumentProcessor {
  /**
   * Process a document and extract text
   * @param {string} filePath - Path to the file
   * @param {string} fileType - Type of file (pdf, docx, xlsx, etc.)
   * @returns {Object} - Extracted content with metadata
   */
  async processFile(filePath, fileType) {
    try {
      switch (fileType) {
        case 'pdf':
          return await this.processPDF(filePath);
        case 'docx':
          return await this.processDocx(filePath);
        case 'xlsx':
          return await this.processXlsx(filePath);
        case 'pptx':
          return await this.processPptx(filePath);
        case 'markdown':
        case 'text':
        case 'code':
          return await this.processText(filePath);
        default:
          return await this.processText(filePath);
      }
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Process PDF file
   */
  async processPDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    return {
      raw: data.text,
      wordCount: this.countWords(data.text),
      pageCount: data.numpages,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        createdDate: data.info?.CreationDate,
        modifiedDate: data.info?.ModDate
      }
    };
  }

  /**
   * Process DOCX file
   */
  async processDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    return {
      raw: text,
      wordCount: this.countWords(text),
      pageCount: Math.ceil(this.countWords(text) / 500), // Estimate
      messages: result.messages
    };
  }

  /**
   * Process XLSX file
   */
  async processXlsx(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheets = [];
    let fullText = '';

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      sheets.push({ name: sheetName, content: csv });
      fullText += `\n--- Sheet: ${sheetName} ---\n${csv}`;
    });

    return {
      raw: fullText,
      wordCount: this.countWords(fullText),
      pageCount: sheets.length,
      metadata: {
        sheetNames: workbook.SheetNames,
        sheetsCount: workbook.SheetNames.length
      }
    };
  }

  /**
   * Process PPTX file (basic text extraction)
   * Note: Full PPTX parsing would require additional library
   */
  async processPptx(filePath) {
    // For now, try to extract as text or return placeholder
    try {
      const content = await fs.readFile(filePath);
      return {
        raw: '[PowerPoint content - requires specialized parsing]',
        wordCount: 0,
        pageCount: 0
      };
    } catch (error) {
      throw new Error('PPTX parsing not fully implemented');
    }
  }

  /**
   * Process plain text file
   */
  async processText(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    
    return {
      raw: content,
      wordCount: this.countWords(content),
      pageCount: 1
    };
  }

  /**
   * Process web page URL
   */
  async processWebPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeAssistant/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, .ads, .advertisement').remove();
      
      // Extract title
      const title = $('title').text().trim() || 
                   $('h1').first().text().trim() ||
                   'Untitled Page';
      
      // Extract main content
      let content = '';
      
      // Try common content selectors
      const contentSelectors = [
        'article', 'main', '.content', '.post-content', 
        '.article-content', '#content', '.entry-content'
      ];
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length) {
          content = element.text();
          break;
        }
      }
      
      // Fallback to body
      if (!content) {
        content = $('body').text();
      }
      
      // Clean up whitespace
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      // Extract description
      const description = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') ||
                         '';

      return {
        raw: content,
        title,
        description,
        wordCount: this.countWords(content),
        pageCount: 1,
        metadata: {
          url,
          domain: new URL(url).hostname
        }
      };
    } catch (error) {
      logger.error(`Error fetching web page ${url}:`, error);
      throw new Error(`Failed to fetch web page: ${error.message}`);
    }
  }

  /**
   * Count words in text
   */
  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Split text into chunks for embedding
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum characters per chunk
   * @param {number} overlap - Overlap between chunks
   * @returns {Array} - Array of text chunks
   */
  splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
    if (!text || text.length <= chunkSize) {
      return text ? [text] : [];
    }

    const chunks = [];
    let start = 0;

    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to end at a sentence boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const boundary = Math.max(lastPeriod, lastNewline);
        
        if (boundary > start + chunkSize / 2) {
          end = boundary + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
      
      // Avoid infinite loop
      if (start >= text.length - overlap) break;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }
}

module.exports = new DocumentProcessor();
