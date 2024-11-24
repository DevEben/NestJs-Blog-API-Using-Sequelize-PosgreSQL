import { Injectable, BadRequestException } from '@nestjs/common';
import * as multer from 'multer';

@Injectable()
export class FileUploadService {
  // Configure storage options
  private storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = process.env.UPLOAD_PATH || './uploads'; // Use environment variable or default
      cb(null, uploadPath); // Save files to the specified directory
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now(); // Add a timestamp to ensure uniqueness
      const sanitizedFilename = file.originalname.replace(/\s/g, '_'); // Replace spaces with underscores
      cb(null, `${timestamp}-${sanitizedFilename}`); // Combine timestamp with sanitized filename
    },
  });

  // Define file filter configuration
  private readonly fileFilter: multer.Options['fileFilter'] = (
    req,
    file,
    cb,
  ) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true); // Allow supported files
    } else {
      cb(
        new BadRequestException(
          'Only images (JPEG, PNG, GIF), PDFs, and DOC/DOCX files are allowed!',
        ) as any | null,
        false,
      ); // Reject unsupported files with an error
    }
  };

  // Configure Multer instance
  public readonly upload = multer({
    storage: this.storage,
    fileFilter: this.fileFilter,
    limits: {
      fileSize: 4 * 1024 * 1024, // Limit file size to 4MB
    },
  });

  public getMulterOptions() {
    return {
      storage: this.storage,
      fileFilter: this.fileFilter,
      limits: {
        fileSize: 4 * 1024 * 1024, // Limit file size to 4MB
      },
    };
  }
}
