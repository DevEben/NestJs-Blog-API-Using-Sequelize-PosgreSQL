import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { AuthService } from 'src/middleware/auth/auth.service';
import { CloudinaryService } from 'src/middleware/cloudinary';
import { FileUploadService } from 'src/middleware/uploads/file-upload.service';
import { Posts } from './post.model';
import { User } from '../user/user.model';

@Module({
  imports: [SequelizeModule.forFeature([Posts, User])],
  controllers: [PostController],
  providers: [PostService, AuthService, CloudinaryService, FileUploadService],
})
export class PostModule {}
