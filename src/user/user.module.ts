import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.model';
import { AuthService } from 'src/middleware/auth/auth.service';
import { CloudinaryService } from 'src/middleware/cloudinary';
import { FileUploadService } from 'src/middleware/uploads/file-upload.service';

@Module({
  imports: [SequelizeModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, AuthService, CloudinaryService, FileUploadService],
})
export class UserModule {}
