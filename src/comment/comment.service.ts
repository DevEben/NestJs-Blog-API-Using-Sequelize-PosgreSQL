import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Comment } from './comment.model';
import { Posts } from '../post/post.model';
import { User } from '../user/user.model';
import { Like } from './like.model';
import { Share } from './share.model';


@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment) private readonly commentModel: typeof Comment,
    @InjectModel(Posts) private readonly postModel: typeof Posts,
    @InjectModel(Like) private readonly likeModel: typeof Like,
    @InjectModel(Share) private readonly shareModel: typeof Share,
  ) {}

  /**
   * Create a comment on a post
   * @param data - Partial comment data
   * @returns The created comment
   */
  async createComment(data: Partial<Comment>): Promise<Comment> {
    // Ensure the post exists
    const post = await this.postModel.findByPk(data.postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Create the comment
    const comment = await this.commentModel.create(data, {
      include: [
        { model: Posts, as: 'post' }, // Include post association
        { model: User, as: 'author' }, // Include author association
      ],
    });

    return comment;
  }

  /**
   * Get a comment by ID
   * @param id - The comment ID
   * @returns The comment with its associations
   */
  async getCommentById(id: string): Promise<Comment> {
    const comment = await this.commentModel.findOne({
      where: { id },
      include: [
        { model: Posts, as: 'post' }, // Include associated post
        { model: User, as: 'author' }, // Include associated author
      ],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  /**
   * Get all comments for a specific post
   * @param postId - The ID of the post
   * @returns List of comments associated with the post
   */
  async getCommentsByPostId(postId: string): Promise<Comment[]> {
    const post = await this.postModel.findByPk(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comments = await this.commentModel.findAll({
      where: { postId },
      include: [
        { model: User, as: 'author' }, // Include associated author
      ],
    });

    return comments;
  }

  /**
   * Update a comment by ID
   * @param id - The comment ID
   * @param data - Partial data for updating the comment
   * @returns The updated comment
   */
  async updateComment(id: string, data: Partial<Comment>): Promise<Comment> {
    const [affectedRows, [updatedComment]] = await this.commentModel.update(data, {
      where: { id },
      returning: true,
      individualHooks: true,
    });

    if (affectedRows === 0) {
      throw new NotFoundException('Comment not found');
    }

    return updatedComment;
  }

  /**
   * Delete a comment by ID
   * @param id - The comment ID
   */
  async deleteComment(id: string): Promise<void> {
    const comment = await this.getCommentById(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await comment.destroy();
  }

  /**
   * Delete all comments for a specific post
   * @param postId - The ID of the post
   */
  async deleteCommentsByPostId(postId: string): Promise<void> {
    await this.commentModel.destroy({
      where: { postId },
    });
  }


  /**
   * Like a post
   * @param postId - The ID of the post to like
   * @param userId - The ID of the user liking the post
   */
  async likePost(postId: string, userId: string): Promise<Like> {
    // Ensure the post exists
    const post = await this.postModel.findByPk(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if the user already liked the post
    const existingLike = await this.likeModel.findOne({ where: { postId, userId } });
    if (existingLike) {
      throw new BadRequestException('You have already liked this post');
    }

    // Create a new like
    return this.likeModel.create({ postId, userId });
  }

  /**
   * Unlike a post
   * @param postId - The ID of the post to unlike
   * @param userId - The ID of the user unliking the post
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    // Find the like entry
    const like = await this.likeModel.findOne({ where: { postId, userId } });
    if (!like) {
      throw new NotFoundException('You have not liked this post');
    }

    // Delete the like
    await like.destroy();
  }

  /**
   * Share a post
   * @param postId - The ID of the post to share
   * @param userId - The ID of the user sharing the post
   */
  async sharePost(postId: string, userId: string): Promise<Share> {
    // Ensure the post exists
    const post = await this.postModel.findByPk(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if the user already shared the post
    const existingShare = await this.shareModel.findOne({ where: { postId, userId } });
    if (existingShare) {
      throw new BadRequestException('You have already shared this post');
    }

    // Create a new share
    return this.shareModel.create({ postId, userId });
  }

  /**
   * Unshare a post
   * @param postId - The ID of the post to unshare
   * @param userId - The ID of the user unsharing the post
   */
  async unsharePost(postId: string, userId: string): Promise<void> {
    // Find the share entry
    const share = await this.shareModel.findOne({ where: { postId, userId } });
    if (!share) {
      throw new NotFoundException('You have not shared this post');
    }

    // Delete the share
    await share.destroy();
  }
}
