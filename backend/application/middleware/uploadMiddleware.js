const multer = require('multer');

// Store file in memory buffer so FileService can inspect signature and stream to storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type and extension
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      const err = new Error('Only PDF files (.pdf) are permitted');
      err.code = 'INVALID_FILE_TYPE';
      cb(err, false);
    }
  },
});

/**
 * Flexible middleware supporting field names 'pdf', 'file', or 'attachment'
 */
function handlePdfUpload() {
  const uploadFields = upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'file', maxCount: 1 },
    { name: 'attachment', maxCount: 1 },
  ]);

  return (req, res, next) => {
    uploadFields(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File size exceeds maximum allowed limit of 10 MB',
            code: 'FILE_TOO_LARGE',
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            error: err.message,
            code: 'INVALID_FILE_TYPE',
          });
        }
        return res.status(400).json({
          error: `Upload error: ${err.message}`,
          code: 'UPLOAD_ERROR',
        });
      }

      // Normalize uploaded file to req.file
      if (req.files) {
        req.file = req.files['pdf']?.[0] || req.files['file']?.[0] || req.files['attachment']?.[0] || null;
      }

      next();
    });
  };
}

module.exports = {
  upload,
  handlePdfUpload,
};
