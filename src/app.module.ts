import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModule } from './user/user.module';
import { PostModule } from './post/post.module';
import { User } from 'src/user/user.model';
import { Picture } from 'src/user/picture.model';
import { Posts } from 'src/post/post.model';
import { MediaFile } from 'src/post/mediaFile.model';
import { Comment } from 'src/comment/comment.model';
import { Like } from 'src/comment/like.model';
import { Share } from 'src/comment/share.model';
import { Admin } from 'src/admin/admin.model';
// import { CommentModule } from './comment/comment.module';
import { UploadModule } from 'src/middleware/uploads/upload.module';

import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import { connectToDatabase, sequelizeInstance } from './config/database.config';
dotenv.config();

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DBHOST,
      port: +process.env.DBPORT,
      username: process.env.DBUSERNAME,
      password: process.env.DBPASSWORD,
      database: process.env.DATABASE,
      models: [User, Picture, Posts, MediaFile, Comment, Like, Share, Admin],
      autoLoadModels: true,
      synchronize: process.env.NODE_ENV !== 'production', // Avoid schema sync in production
      // dialectOptions: {
      //   ssl: {
      //     require: true,
      //     rejectUnauthorized: false, // Disable strict SSL validation
      //   },
      // },
    }),
    UserModule,
    PostModule,
    // CommentModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: Sequelize, // Use Sequelize as the token
      useFactory: async () => {
        // Ensure the database is connected and return the instance
        if (!sequelizeInstance) {
          await connectToDatabase();
        }
        return sequelizeInstance;
      },
    },
  ],
  exports: [Sequelize],
})

export class AppModule {}