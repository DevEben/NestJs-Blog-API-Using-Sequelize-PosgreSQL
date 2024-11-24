import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { AuthService } from 'src/middleware/auth/auth.service';
import { Posts } from '../post/post.model';
import { User } from '../user/user.model';
import { Comment } from './comment.model';
import { Like } from './like.model';
import { Share } from './share.model';


@Module({
  imports: [SequelizeModule.forFeature([Posts, User, Comment, Like, Share])],
  controllers: [CommentController],
  providers: [CommentService, AuthService],
})
export class PostModule {}
