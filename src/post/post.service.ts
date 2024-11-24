// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/sequelize';
// import { Posts } from './post.model';

// @Injectable()
// export class PostService {
//   constructor(@InjectModel(Posts) private postModel: typeof Posts) {}

//   async createPost(
//     title: string,
//     content: string,
//     userId: string,
//   ): Promise<Posts> {
//     const post = new this.postModel({ title, content, userId });
//     return await post.save();
//   }

//   async getAllPosts(): Promise<Posts[]> {
//     return this.postModel.findAll();
//   }

//   async getPostById(id: string): Promise<Posts> {
//     return this.postModel.findByPk(id);
//   }
// }


import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Posts } from './post.model';
import { MediaFile } from './mediaFile.model';
import { Comment } from '../comment/comment.model';
import { Like } from '../comment/like.model';
import { Share } from '../comment/share.model';
import { User } from '../user/user.model';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Posts) private readonly postModel: typeof Posts,

  ) {}

  // Create a post with media files and author
  async createPost(data: Partial<Posts>): Promise<Posts> {
    const post = await this.postModel.create(data, {
      include: [
        { model: MediaFile, as: 'mediaFiles' }, // Include media files
        { model: User, as: 'author' },         // Include author details
      ],
    });

    return post;
  }

  // Get one post by ID with related data
  async getPostById(id: string): Promise<Posts | null> {
    const post = await this.postModel.findOne({
      where: { id },
      include: [
        { model: MediaFile, as: 'mediaFiles' }, // Include media files
        { 
          model: Comment, 
          as: 'comments', 
          include: [{ model: User, as: 'author' }], // Include author details in each comment
        },
        { model: Like, as: 'likes' },   // Include likes
        { model: Share, as: 'shares' }, // Include shares
        { model: User, as: 'author' },  // Include author details
      ],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  // Get all posts with related data
  async getAllPosts(): Promise<Posts[]> {
    const posts = await this.postModel.findAll({
      include: [
        { model: MediaFile, as: 'mediaFiles' },
        { model: Comment, as: 'comments' },
        { model: Like, as: 'likes' },
        { model: Share, as: 'shares' },
        { model: User, as: 'author' },
      ],
    });

    return posts;
  }

  // Update post by ID with partial data
  async updatePost(id: string, data: Partial<Posts>): Promise<Posts> {
    const [affectedRows, [updatedPost]] = await this.postModel.update(data, {
      where: { id },
      returning: true,
      individualHooks: true,
    });

    if (affectedRows === 0) {
      throw new NotFoundException('Post not found');
    }

    return updatedPost;
  }

  // Delete post by ID
  async deletePost(id: string): Promise<void> {
    const post = await this.getPostById(id); // Ensure post exists before deleting

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Delete associated media files, if necessary
    await MediaFile.destroy({
      where: { postId: id },
    });

    await post.destroy();
  }

  // Delete post's media files by post ID
  async deleteMediaFilesByPostId(postId: string): Promise<number> {
    const deletedFiles = await MediaFile.destroy({
      where: { postId },
    });

    return deletedFiles;
  }


  async updateMediaFiles(
    postId: string,
    mediaFiles: { url: string; public_id: string }[],
  ): Promise<void> {
    // Delete existing media files for the post
    await MediaFile.destroy({ where: { postId } });
  
    // Bulk create new media files
    const newMediaFiles = mediaFiles.map((file) => ({
      url: file.url,
      public_id: file.public_id,
      postId,
    }));
  
    await MediaFile.bulkCreate(newMediaFiles);
  }
  
  
}
