const fs = require('fs');
const path = require('path');
const supabase = require('../supabase/client');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const BUCKET_NAME = 'assignment-pdfs';
const LOCAL_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'assignment-pdfs');

// Ensure local directory exists
if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

class FileService {
  /**
   * Validate uploaded PDF file buffer & metadata
   */
  validatePDF(file) {
    if (!file) {
      const err = new Error('No file provided');
      err.statusCode = 400;
      throw err;
    }

    // Check MIME type
    if (file.mimetype !== 'application/pdf') {
      const err = new Error('Invalid file type: Only PDF files (.pdf) are permitted');
      err.statusCode = 400;
      throw err;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const err = new Error(`File size exceeds maximum allowed limit of 10 MB (received ${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      err.statusCode = 400;
      throw err;
    }

    // Validate magic bytes (PDF header: %PDF = 0x25, 0x50, 0x44, 0x46)
    if (file.buffer && file.buffer.length >= 4) {
      const header = file.buffer.toString('utf8', 0, 4);
      if (header !== '%PDF') {
        const err = new Error('File signature verification failed: File is not a valid PDF document');
        err.statusCode = 400;
        throw err;
      }
    }

    return true;
  }

  /**
   * Sanitize filename to prevent directory traversal and unsafe characters
   */
  sanitizeFilename(originalName) {
    if (!originalName) return 'attachment.pdf';
    // Remove directory traversal characters and unsafe path characters
    const base = path.basename(originalName);
    const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_');
    return sanitized.endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
  }

  /**
   * Upload PDF to storage (Supabase or local fallback)
   */
  async uploadAssignmentPDF(file, courseId = 'general') {
    this.validatePDF(file);

    const safeName = this.sanitizeFilename(file.originalname);
    const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const storagePath = `${courseId}/${uniquePrefix}-${safeName}`;

    // If Supabase is configured, upload to Supabase Storage
    if (supabase.isConfigured) {
      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file.buffer, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.warn('Supabase storage upload failed, saving to local fallback:', uploadError.message);
          return this.saveToLocal(file, storagePath, safeName);
        }

        return {
          attachment_path: storagePath,
          attachment_name: safeName,
          storage_type: 'supabase',
        };
      } catch (err) {
        console.warn('Error uploading to Supabase storage, falling back to local:', err.message);
        return this.saveToLocal(file, storagePath, safeName);
      }
    }

    // Local file storage fallback
    return this.saveToLocal(file, storagePath, safeName);
  }

  /**
   * Save file to local uploads directory (for demo mode / fallback)
   */
  saveToLocal(file, storagePath, safeName) {
    const filePath = path.join(LOCAL_UPLOAD_DIR, path.basename(storagePath));
    fs.writeFileSync(filePath, file.buffer);
    return {
      attachment_path: `local:${path.basename(storagePath)}`,
      attachment_name: safeName,
      storage_type: 'local',
    };
  }

  /**
   * Generate a signed or viewable URL for an assignment PDF attachment
   */
  async getAttachmentUrl(attachmentPath) {
    if (!attachmentPath) return null;

    if (attachmentPath.startsWith('local:')) {
      const filename = attachmentPath.replace('local:', '');
      return `/assignments/files/${filename}`;
    }

    if (supabase.isConfigured) {
      try {
        // Create a signed URL valid for 1 hour (3600 seconds)
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(attachmentPath, 3600);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }

        // Fallback to public URL if bucket is configured public
        const { data: pubData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(attachmentPath);

        return pubData?.publicUrl || null;
      } catch (err) {
        console.warn('Failed to generate signed URL from Supabase:', err.message);
        return null;
      }
    }

    return null;
  }

  /**
   * Delete an assignment PDF file from storage
   */
  async deleteAttachment(attachmentPath) {
    if (!attachmentPath) return true;

    if (attachmentPath.startsWith('local:')) {
      const filename = attachmentPath.replace('local:', '');
      const filePath = path.join(LOCAL_UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { console.error('Failed to unlink local file:', e); }
      }
      return true;
    }

    if (supabase.isConfigured) {
      try {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([attachmentPath]);
        return true;
      } catch (err) {
        console.error('Failed to remove file from Supabase storage:', err.message);
        return false;
      }
    }

    return true;
  }

  /**
   * Get local file stream/path for download
   */
  getLocalFilePath(filename) {
    const safe = path.basename(filename);
    const filePath = path.join(LOCAL_UPLOAD_DIR, safe);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  }
}

module.exports = new FileService();
