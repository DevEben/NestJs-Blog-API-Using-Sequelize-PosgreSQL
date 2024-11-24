import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { ImageUploadController } from './image-upload.controller';
import { DocumentUploadController } from './document-upload.controller';

@Module({
  controllers: [ImageUploadController, DocumentUploadController],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class UploadModule {}
