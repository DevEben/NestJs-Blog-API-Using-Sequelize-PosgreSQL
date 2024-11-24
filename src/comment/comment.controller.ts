import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Req,
  Res,
  HttpStatus,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PostService } from '../post/post.service';
import { CommentService } from './comment.service';
import { Like } from '../comment/like.model';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from '../middleware/auth/jwt-auth.guard';
import { Share } from './share.model';

@Controller('api/v1/comment')
export class CommentController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly userService: UserService,
  ) {}

  @Post('add-comment/:id')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Body() body: { comment: string },
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const postId = id;
      const userId = req.user?.userId;

      if (!userId) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User ID not provided' });
      }

      const user = await this.userService.getUserById(userId);
      if (!user)
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User not found!' });

      const { comment } = body;
      if (!comment) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Comment content is required' });
      }

      const post = await this.postService.getPostById(postId);
      if (!post)
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'Post not found!' });

      // Prepare comment data according to the schema
      const commentData = {
        content: comment,
      };

      // Create a new comment associated with the post and author
      const newComment = await this.commentService.createComment(commentData);

      return res.status(HttpStatus.CREATED).json({
        message: 'Comment added successfully',
        comment: newComment,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }

  @Get('view-comments/:id')
  @UseGuards(JwtAuthGuard)
  async viewComments(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const postId = id;

      // Fetch the comments with related post and author details in each comment
      const comments = await this.commentService.getCommentsByPostId(postId);
      if (!comments || comments.length === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'No comments on this post',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `List of comments on post: ${comments.length}`,
        data: comments,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }

  @Get('view-comment/:id')
  @UseGuards(JwtAuthGuard)
  async viewOneComment(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const commentId = id;

      // Fetch the comment with related post and author detail in each comment
      const comment = await this.commentService.getCommentById(commentId);
      if (!comment) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'No comment on this post',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: `comment successfully fetched!`,
        data: comment,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }

  @Put('update-comment/:id')
  async updateComment(
    @Body() body: { comment: string },
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const commentId = id;

      // Fetch the existing comment
      const existingComment =
        await this.commentService.getCommentById(commentId);
      if (!existingComment) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Comment not found!',
        });
      }

      // Prepare the updated comment data
      const updatedCommentData = {
        content: body.comment || existingComment.content,
      };

      // Update the comment
      const updatedComment = await this.commentService.updateComment(
        commentId,
        updatedCommentData,
      );
      if (!updatedComment) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Unable to update comment!',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Comment updated successfully!',
        data: updatedComment,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }

  @Delete('delete-comment/:id')
  async deleteComment(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const commentId = id;

      // Fetch the comment to ensure it exists before deletion then Proceed to delete the comment
      const deletedComment: any =
        await this.commentService.deleteComment(commentId);
      if (!deletedComment) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Unable to delete comment!',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Comment deleted successfully!',
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }

  @Delete('delete-comments/:id')
  async deleteCommentsFromPost(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const postId = id;

      // Fetch the comment to ensure it exists before deletion then Proceed to delete all the comments related to that post
      const deletedComment: any =
        await this.commentService.deleteCommentsByPostId(postId);
      if (!deletedComment) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Unable to deletes all comments!',
        });
      }

      return res.status(HttpStatus.OK).json({
        message: 'Comments deleted successfully',
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }

  @Post('like-post/:id')
  @UseGuards(JwtAuthGuard)
  async likeUnlikePost(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'User ID not provided' });
      }

      const postId = id;
      const post = await this.postService.getPostById(postId);
      if (!post)
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'Post not found!' });

      // Check if the user has already liked the post
      const existingLike = await Like.findOne({
        where: { postId, userId },
      });

      if (!existingLike) {
        // If not liked, create a new like
        await this.commentService.likePost(postId, userId);
        return res.status(200).json({ message: 'Post liked successfully' });
      } else {
        // If already liked, delete the existing like
        await this.commentService.unlikePost(postId, userId);
        return res.status(200).json({ message: 'Post unliked successfully' });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }

  @Post('share-post/:id')
  @UseGuards(JwtAuthGuard)
  async shareUnsharePost(
    @Param('id') id: string,
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'User ID not provided',
        });
      }

      const postId = id;
      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Post not found!',
        });
      }

      // Generate share links dynamically
      const generateShareLink = (platform: string) => {
        const postUrl = `${req.protocol}://${req.get('host')}/api/v1/post/get-post/${postId}`;
        const postTitle = encodeURIComponent(post.title);

        switch (platform) {
          case 'facebook':
            return `https://www.facebook.com/sharer/sharer.php?u=${postUrl}&quote=${postTitle}`;
          case 'twitter':
            return `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
          case 'linkedin':
            return `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}&title=${postTitle}`;
          default:
            return '';
        }
      };

      const shareButtons = {
        facebook: generateShareLink('facebook'),
        twitter: generateShareLink('twitter'),
        linkedin: generateShareLink('linkedin'),
      };

      // Check if the user has already shared the post
      const existingShare = await Share.findOne({
        where: { postId, userId },
      });

      if (!existingShare) {
        // If not shared, create a new share
        await this.commentService.sharePost(postId, userId);
        return res.status(HttpStatus.CREATED).json({
          message: 'Post shared successfully!',
          shareButtons,
        });
      } else {
        // If already shared, unshare the post
        await this.commentService.unsharePost(postId, userId);
        return res.status(HttpStatus.OK).json({
          message: 'Post unshared successfully!',
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
      }
    }
  }
}
