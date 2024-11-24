import { Sequelize } from 'sequelize-typescript';
import * as dotenv from 'dotenv';
import { User } from 'src/user/user.model';
import { Picture } from 'src/user/picture.model';
import { Posts } from 'src/post/post.model';
import { MediaFile } from 'src/post/mediaFile.model';
import { Comment } from 'src/comment/comment.model';
import { Like } from 'src/comment/like.model';
import { Share } from 'src/comment/share.model';
import { Admin } from 'src/admin/admin.model';

// Load environment variables from .env file
dotenv.config();

// Singleton Sequelize instance
export let sequelizeInstance: Sequelize;

export const connectToDatabase = async (): Promise<Sequelize> => {
  if (!sequelizeInstance) {
    sequelizeInstance = new Sequelize({
      dialect: 'postgres',
      host: process.env.DBHOST,
      port: +process.env.DBPORT,
      username: process.env.DBUSERNAME,
      password: process.env.DBPASSWORD,
      database: process.env.DATABASE,
      models: [User, Picture, Posts, MediaFile, Comment, Like, Share, Admin],
      // dialectOptions: {
      //   ssl: {
      //     require: true,
      //     rejectUnauthorized: false, // Disable strict SSL validation
      //   },
      // },
    });

    try {
      await sequelizeInstance.authenticate();
      console.log('Connected to the database successfully');
    } catch (error) {
      console.error('Error connecting to the database:', error.message);
      process.exit(1); // Exit the process on failure
    }
  }
  return sequelizeInstance;
};
