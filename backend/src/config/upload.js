const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create user-specific folder
    const userFolder = path.join(uploadDir, req.userId?.toString() || 'anonymous');
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // PDFs
    'application/pdf',
    // Office documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/msword', // doc
    'application/vnd.ms-excel', // xls
    'application/vnd.ms-powerpoint', // ppt
    // Text
    'text/plain',
    'text/markdown',
    'text/csv',
    // Code
    'text/javascript',
    'application/javascript',
    'text/x-python',
    'application/x-python-code',
    'text/x-java-source',
    'text/x-c',
    'text/x-c++',
    'application/json',
    'text/html',
    'text/css',
    'application/xml',
    'text/xml'
  ];

  // Also check by extension for common code files
  const allowedExtensions = [
    '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
    '.txt', '.md', '.markdown', '.csv',
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h',
    '.json', '.html', '.css', '.xml', '.yaml', '.yml',
    '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// Size limit
const maxSize = (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024;

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// Helper to get file type from mimetype or extension
const getFileType = (mimetype, filename) => {
  const ext = path.extname(filename).toLowerCase();
  
  if (mimetype === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (mimetype.includes('wordprocessing') || ['.docx', '.doc'].includes(ext)) return 'docx';
  if (mimetype.includes('spreadsheet') || ['.xlsx', '.xls'].includes(ext)) return 'xlsx';
  if (mimetype.includes('presentation') || ['.pptx', '.ppt'].includes(ext)) return 'pptx';
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (mimetype.startsWith('text/') || ['.txt', '.csv'].includes(ext)) return 'text';
  if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.go', '.rs', '.rb', '.php'].includes(ext)) return 'code';
  
  return 'other';
};

module.exports = {
  upload,
  getFileType,
  uploadDir
};
