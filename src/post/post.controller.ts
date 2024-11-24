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
  UseInterceptors,
  UploadedFiles,
  Delete,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PostService } from './post.service';
import { JwtAuthGuard } from '../middleware/auth/jwt-auth.guard';
import { CloudinaryService } from 'src/middleware/cloudinary';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../middleware/uploads/file-upload.service';
import { Posts } from './post.model';
import * as fs from 'fs';

@Controller('api/v1/post')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post('create-post')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, new FileUploadService().getMulterOptions()), // Handle multiple files (limit: 10 files)
  )
  async createPost(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { title: string; content: string },
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

      const { title, content } = body;

      // Handle file uploads
      const uploadedMediaFiles = [];
      if (files && Array.isArray(files)) {
        for (const file of files) {
          try {
            const uploadedFile = await this.cloudinaryService.uploadImage(
              file.path,
              `postImg_${userId}`,
            );

            uploadedMediaFiles.push({
              url: uploadedFile.secure_url,
              public_id: uploadedFile.public_id,
            });

            // Delete temporary file after upload
            fs.unlinkSync(file.path);
          } catch (uploadError) {
            console.error('File upload failed:', uploadError);
            return res
              .status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({ message: 'File upload failed', error: uploadError.message });
          }
        }
      }

      // Prepare post data
      const postData = {
        title,
        content,
        authorId: userId, // Link the author by ID
        mediaFiles: uploadedMediaFiles, // Add media files
      };

      // Create post
      const newPost = await this.postService.createPost(postData);

      return res.status(HttpStatus.CREATED).json({
        message: 'Post created successfully',
        post: newPost,
      });

    } catch (error: unknown) {
      console.error('Error creating post:', error);
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          message: `Internal Server Error: ${error.message}` 
        });
      }
  }
}



  @Get('get-posts')
  async getAllPosts(
    @Req() req: Request, 
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const posts = await this.postService.getAllPosts();
      if (!posts || posts.length < 1) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: "No posts found" });
      }
      return res.status(HttpStatus.OK).json({
        message: "List of all posts in the blog: " + posts.length,
        Posts: posts
      });
  
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          message: `Internal Server Error: ${error.message}` 
        });
      }
  }
  }

  @Get('get-post/:id')
  async getPostById(
    @Param('id') id: string,
    @Req() req: Request, 
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const postId = id;
      const post = await this.postService.getPostById(postId);
      if (!post) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: "No post found" });
      }
      return res.status(HttpStatus.OK).json({ message: "The selected post is:", Post: post });

    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          message: `Internal Server Error: ${error.message}` 
        });
      }
  }
  }


  @Put('update-post/:id')
  @UseGuards(JwtAuthGuard)
  async updatePost(
    @UploadedFiles() files: Express.Multer.File[],
    @Param('id') id: string,
    @Body() body: { title: string; content: string },
    @Req() req: Request &{ user: { userId: string } }, 
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const postId = id;

    // Fetch the existing post
    const post = await this.postService.getPostById(postId);
    if (!post) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ message: 'Post not found' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Unauthorized' });
    }

    // Ensure the current user is the author of the post
    if (post.authorId !== userId) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ message: 'You are not allowed to update this post' });
    }

    // Existing media files and new uploads
    const existingMediaFiles = post.mediaFiles || [];
    const uploadedMediaFiles: { url: string; public_id: string }[] = [];

    // Handle file uploads
    if (files && Array.isArray(files)) {
      for (const file of files) {
        try {
          const uploadedFile = await this.cloudinaryService.uploadImage(
            file.path,
            `postImg_${postId}`,
          );

          uploadedMediaFiles.push({
            url: uploadedFile.secure_url,
            public_id: uploadedFile.public_id,
          });

          // Delete temporary file after upload
          fs.unlinkSync(file.path);
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            message: 'File upload failed',
            error: uploadError.message,
          });
        }
      }
    }

    // Prepare updated post data
    const updatedPostData = {
      title: body.title || post.title,
      content: body.content || post.content,
    };

    // Update the main post fields
    const updatedPost = await this.postService.updatePost(postId, updatedPostData);

    // Update media files if new ones are uploaded
    if (uploadedMediaFiles.length > 0) {
      await this.postService.updateMediaFiles(postId, uploadedMediaFiles);
    }

    // Return success response
    return res.status(HttpStatus.OK).json({
      message: 'Post updated successfully',
      post: {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        mediaFiles: updatedPost?.mediaFiles || existingMediaFiles, // Include updated media files or the existing ones if no new files
      },
    });

    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          message: `Internal Server Error: ${error.message}` 
        });
      }
  }
  }


  @Delete('delete-post/:id')
  async deletePost(
    @Param('id') id: string,
    @Req() req: Request, 
    @Res() res: Response,
  ): Promise<Response> {
    try {
      const postId = id;
  
      // Get the post and its associated media files before deleting
      const post = await this.postService.getPostById(postId);
  
      if (!post) {
        return res.status(HttpStatus.NOT_FOUND).json({ message: "No post found" });
      }
  
      // Check if there are media files associated with the post
      const mediaFiles = post.mediaFiles || [];
  
      // Delete media files from Cloudinary if they exist
      for (const mediaFile of mediaFiles) {
        const publicId = mediaFile.public_id;
        await this.cloudinaryService.deleteImage(publicId);
      }
  
      // Now delete the post and the associated media files from the database
      const deletedPost: any = await this.postService.deletePost(postId); // Adjust as per your ORM model
  
      if (!deletedPost) {
        return res.status(HttpStatus.BAD_REQUEST).json({ message: "Failed to delete the post from the database" });
      }
  
      // Optionally, delete associated media files from the media table
      await this.postService.deleteMediaFilesByPostId(postId); // Assuming you have a method to delete media files
  
      return res.status(HttpStatus.OK).json({ message: 'Post and associated media files deleted successfully' });
  
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ 
          message: `Internal Server Error: ${error.message}` 
        });
      }
  }
  }
}
