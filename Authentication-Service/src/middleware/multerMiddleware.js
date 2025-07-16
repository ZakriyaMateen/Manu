import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const createUploadsDir = () => {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('📁 Created uploads directory:', uploadsDir);
    }
    return uploadsDir;
};

// Initialize uploads directory
createUploadsDir();

// Shared storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log(`📋 Processing file: ${file.fieldname} | Original: ${file.originalname}`);
        const dir = './public/uploads';

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log('📁 Created directory:', dir);
        }

        cb(null, dir);
    },
    filename: function (req, file, cb) {
        console.log(`💾 Generating filename for: ${file.originalname}`);

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);

        // Clean filename - remove spaces and special characters
        const cleanName = name
            .replace(/[^a-zA-Z0-9\-_]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const finalFilename = `${cleanName}-${uniqueSuffix}${ext}`;
        console.log(`📝 Generated filename: ${finalFilename}`);

        cb(null, finalFilename);
    }
});

// Comprehensive list of allowed file types
const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/bmp', 'image/tiff', 'image/svg+xml', 'image/webp',
    'image/heif', 'image/heic', 'image/avif',

    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',

    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',

    // Additional formats
    'application/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation'
];

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
    document: 100 * 1024 * 1024, // 100MB for documents
    image: 10 * 1024 * 1024,     // 10MB for images
    avatar: 5 * 1024 * 1024      // 5MB for avatars
};

// Utility function to get file category
const getFileCategory = (mimetype) => {
    if (mimetype.startsWith('image/')) return 'image';
    return 'document';
};

// Utility function to validate file type
const isAllowedFileType = (mimetype) => {
    return allowedTypes.includes(mimetype.toLowerCase());
};

// Utility function to get appropriate size limit
const getSizeLimit = (fieldname, mimetype) => {
    if (fieldname === 'avatar') return FILE_SIZE_LIMITS.avatar;
    if (mimetype.startsWith('image/')) return FILE_SIZE_LIMITS.image;
    return FILE_SIZE_LIMITS.document;
};

// 1. Strict configuration for document uploads (requires files_ prefix)
const documentFileFilter = (req, file, cb) => {
    console.log(`🔍 Validating document file: ${file.fieldname} | Type: ${file.mimetype}`);

    // Check if fieldname starts with files_
    if (!file.fieldname.startsWith('files_')) {
        const error = new Error('Document uploads require field names starting with "files_"');
        error.code = 'INVALID_FIELDNAME';
        return cb(error, false);
    }

    // Extract document ID from fieldname
    const documentId = file.fieldname.replace('files_', '');
    if (!documentId) {
        const error = new Error('Invalid document ID in fieldname');
        error.code = 'INVALID_DOCUMENT_ID';
        return cb(error, false);
    }

    // Validate file type
    if (!isAllowedFileType(file.mimetype)) {
        const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
    }

    console.log(`✅ Document file validated: ${file.originalname}`);
    cb(null, true);
};

// 2. Flexible configuration for other uploads (like avatars, general files)
const generalFileFilter = (req, file, cb) => {
    console.log(`🔍 Validating general file: ${file.fieldname} | Type: ${file.mimetype}`);

    // Validate file type
    if (!isAllowedFileType(file.mimetype)) {
        const error = new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
        error.code = 'INVALID_FILE_TYPE';
        return cb(error, false);
    }

    console.log(`✅ General file validated: ${file.originalname}`);
    cb(null, true);
};

// Document upload configuration (for application documents)
export const documentUpload = multer({
    storage,
    limits: {
        fileSize: FILE_SIZE_LIMITS.document,
        files: 50 // Maximum 50 files per request
    },
    fileFilter: documentFileFilter
});

// General upload configuration (for avatars, etc.)
export const upload = multer({
    storage,
    limits: {
        fileSize: FILE_SIZE_LIMITS.document,
        files: 10 // Maximum 10 files per request
    },
    fileFilter: generalFileFilter
});

// Avatar-specific upload configuration
export const avatarUpload = multer({
    storage,
    limits: {
        fileSize: FILE_SIZE_LIMITS.avatar,
        files: 1 // Only one avatar file
    },
    fileFilter: (req, file, cb) => {
        console.log(`🔍 Validating avatar file: ${file.mimetype}`);

        // Only allow images for avatars
        if (!file.mimetype.startsWith('image/')) {
            const error = new Error('Avatar must be an image file');
            error.code = 'INVALID_AVATAR_TYPE';
            return cb(error, false);
        }

        if (!isAllowedFileType(file.mimetype)) {
            const error = new Error(`Invalid image type: ${file.mimetype}`);
            error.code = 'INVALID_FILE_TYPE';
            return cb(error, false);
        }

        console.log(`✅ Avatar file validated: ${file.originalname}`);
        cb(null, true);
    }
});

// Enhanced error handler with detailed error messages
export const uploadErrorHandler = (err, req, res, next) => {
    console.error('❌ Upload error:', err);

    // Clean up any uploaded files if there's an error
    if (req.files && req.files.length > 0) {
        console.log('🧹 Cleaning up uploaded files due to error');
        req.files.forEach(file => {
            if (fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Deleted file: ${file.path}`);
                } catch (deleteError) {
                    console.error(`❌ Error deleting file ${file.path}:`, deleteError.message);
                }
            }
        });
    }

    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(413).json({
                    success: false,
                    error: 'File too large',
                    message: `Maximum file size is ${FILE_SIZE_LIMITS.document / (1024 * 1024)}MB`,
                    code: 'FILE_TOO_LARGE'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    error: 'Too many files',
                    message: 'Maximum number of files exceeded',
                    code: 'TOO_MANY_FILES'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    error: 'Unexpected file field',
                    message: 'Unexpected file field name',
                    code: 'UNEXPECTED_FIELD'
                });
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Upload error',
                    message: err.message,
                    code: err.code || 'MULTER_ERROR'
                });
        }
    } else if (err) {
        // Custom errors from file filters
        const statusCode = err.code === 'INVALID_FILE_TYPE' ? 415 : 400;
        return res.status(statusCode).json({
            success: false,
            error: 'File validation error',
            message: err.message,
            code: err.code || 'VALIDATION_ERROR'
        });
    }

    next();
};

// Utility function to get file info
export const getFileInfo = (file) => {
    return {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/${file.filename}`,
        category: getFileCategory(file.mimetype),
        uploadedAt: new Date()
    };
};

// Utility function to validate file before processing
export const validateFileExists = (filePath) => {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        console.error('Error checking file existence:', error);
        return false;
    }
};

// Utility function to delete a single file
export const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted file: ${filePath}`);
            return true;
        } else {
            console.log(`⚠️ File not found: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error deleting file ${filePath}:`, error.message);
        return false;
    }
};

// Utility function to get upload stats
export const getUploadStats = () => {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
        if (!fs.existsSync(uploadsDir)) {
            return { totalFiles: 0, totalSize: 0 };
        }

        const files = fs.readdirSync(uploadsDir);
        let totalSize = 0;

        files.forEach(file => {
            const filePath = path.join(uploadsDir, file);
            try {
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            } catch (error) {
                console.error(`Error getting stats for ${file}:`, error.message);
            }
        });

        return {
            totalFiles: files.length,
            totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
        };
    } catch (error) {
        console.error('Error getting upload stats:', error);
        return { totalFiles: 0, totalSize: 0, error: error.message };
    }
};

// Export configuration object for easy access
export const uploadConfig = {
    allowedTypes,
    sizeLimits: FILE_SIZE_LIMITS,
    uploadsDir: path.join(process.cwd(), 'public', 'uploads')
};

// Export all configurations
export default {
    documentUpload,
    upload,
    avatarUpload,
    uploadErrorHandler,
    getFileInfo,
    validateFileExists,
    deleteFile,
    getUploadStats,
    uploadConfig
};