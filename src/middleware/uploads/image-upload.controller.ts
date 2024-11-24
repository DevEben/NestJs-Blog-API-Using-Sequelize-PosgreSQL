import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';

@Controller('upload')
export class ImageUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { 
            // storage: this.fileUploadService.upload.storage 
            storage: null, // Initial null, overridden in the handler method
            fileFilter: null, // Optional: Override during runtime
        })
    )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded or invalid file type.');
    }
    return {
      message: 'Image uploaded successfully!',
      file: {
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
      },
    };
  }
}
