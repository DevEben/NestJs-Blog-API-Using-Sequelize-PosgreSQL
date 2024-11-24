import {
  Controller,
  Post,
  Body,
  Param,
  Req,
  Res,
  HttpStatus,
  Put,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
  Delete,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import { UserService } from './user.service';
import { Picture } from '../user/picture.model';
import { Admin } from '../admin/admin.model';
import { sendMail } from '../utils/email';
import { generateDynamicEmail } from '../utils/emailText';
import { verifiedHTML } from '../utils/verified';
import { resetFunc } from '../utils/forgot';
import { generateLoginNotificationEmail } from '../utils/sendLoginEmail';
import {
  validateUser,
  validateResetPassword,
  UserData,
  validateUpdatedUser,
} from '../middleware/validator';
import { JwtAuthGuard } from '../middleware/auth/jwt-auth.guard';
import { CloudinaryService } from 'src/middleware/cloudinary';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../middleware/uploads/file-upload.service';

@Controller('api/v1')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  private toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  @Post('signup')
  async signUpUser(
    @Body() body: UserData,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const { error } = validateUser(body);
      if (error) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json(error.details[0].message);
      }

      const { username, email, password } = body;
      if (!username || !email || !password) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Please fill all fields below!' });
      }

      // Check if email exists
      const emailExists = await this.userService.getUserByEmail(email);
      if (emailExists) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Email already exists!' });
      }

      // Hash password
      const SALT_ROUNDS = 12;
      const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

      // Create new user
      const user = await this.userService.createUser({
        username: username.toLocaleLowerCase().trim(),
        email: email.toLocaleLowerCase().trim(),
        password: hashedPassword,
      });

      // Generate verification token
      const token = jwt.sign({ userId: user.id }, process.env.SECRET, {
        expiresIn: '1800s',
      });

      const link = new URL(
        `/api/v1/verify/${user.id}/${token}`,
        `${req.headers['x-forwarded-proto']}://${req.headers['host']}`,
      ).toString();
      const html = generateDynamicEmail(this.toTitleCase(user.username), link);

      // Send email
      try {
        await sendMail({
          email: user.email,
          html,
          subject: 'Email Verification',
        });
      } catch (emailError) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({
            message:
              'Account created, but failed to send verification email. Please contact support.',
          });
      }

      return res.status(HttpStatus.CREATED).json({
        message:
          'Successfully created an account. Please log in to your email and verify your account',
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Post('verify/:id/:token')
  async verifyUser(
    @Param('id') id: string,
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const user = await this.userService.getUserById(id);
      if (!user) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User not found' });
      }

      jwt.verify(token, process.env.SECRET, async (err: any) => {
        if (err) {
          const newToken = jwt.sign({ userId: user.id }, process.env.SECRET, {
            expiresIn: '1800s',
          });
          const link = new URL(
            `/api/v1/verify/${user.id}/${newToken}`,
            `${req.headers['x-forwarded-proto']}://${req.headers['host']}`,
          ).toString();
          await sendMail({
            email: user.email,
            html: generateDynamicEmail(this.toTitleCase(user.username), link),
            subject: 'Re-verify Your Account',
          });
          return res
            .status(HttpStatus.BAD_REQUEST)
            .send('Token expired. A new link has been sent.');
        }

        await this.userService.updateUserById(id, { isVerified: true });
        return res.status(HttpStatus.OK).send(verifiedHTML());
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Post('login')
  async logInUser(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const { email, password } = body;
      if (!email || !password) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Please fill all fields below!' });
      }

      const user = await this.userService.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User not registered' });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Incorrect password' });
      }

      if (!user.isVerified) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({
            message:
              'User not verified. Check your email to verify your account!',
          });
      }

      const token = jwt.sign({ userId: user.id }, process.env.SECRET, {
        expiresIn: '20h',
      });

      return res.status(HttpStatus.OK).json({
        message: `Login successful! Welcome ${user.username}`,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Post('forgot-password')
  async forgotPassword(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const { email } = body;
      if (!email) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Please enter the email below!' });
      }

      const user = await this.userService.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User not registered' });
      }

      const subject = 'Kindly Reset Your Password';
      const link = new URL(
        `/api/v1/reset-password/${user.id}`,
        `${req.headers['x-forwarded-proto']}://${req.headers['host']}`,
      ).toString();
      const html = resetFunc(user.email, link);
      await sendMail({
        email: user.email,
        html,
        subject,
      });

      const newToken = jwt.sign(
        { userId: user.id },
        process.env.SECRET as string,
        { expiresIn: '900s' },
      );
      // Update the user's token to null
      await this.userService.updateUserById(user.id, { token: newToken });

      return res.status(HttpStatus.OK).json({
        message: 'Kindly check your email to reset your password',
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Put('reset-password')
  async resetPassword(
    @Body() body: any,
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const { error } = validateResetPassword(body);
      if (error) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(error.details[0].message);
      }

      const { password, confirmPassword } = body;
      if (!password || !confirmPassword) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Password and Confirm Password cannot be empty!',
        });
      }

      // Find the user by email
      const user = await this.userService.getUserById(id);
      if (!user)
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'user not found' });

      // Check if the token exists and is valid
      if (!user.token) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'No reset token provided' });
      }

      //Check if the link is valid or has expired
      jwt.verify(
        user.token,
        process.env.SECRET as string,
        async (err, decoded) => {
          if (err) {
            // If token is invalid/expired
            return res
              .status(HttpStatus.BAD_REQUEST)
              .json({ message: 'Link has expired!' + err.message });
          } else {
            // Check if password and confirmPassword match
            if (password !== confirmPassword) {
              return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ message: 'Passwords do not match' });
            }

            // If the user already has a password, check if the new password is the same as the old password
            if (user.password && bcrypt.compareSync(password, user.password)) {
              return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ message: "Can't use previous password!" });
            }

            // Generate a salt and hash the new password
            const salt = bcrypt.genSaltSync(12);
            const hashPassword = bcrypt.hashSync(password, salt);
            const userId = user.id;
            // Update the user password with the new hashed password
            const updatedUser = await this.userService.updateUserById(userId, {
              password: hashPassword,
            });
            if (!updatedUser)
              return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ message: "Unable to reset user's password" });

            // Send a successful reset response
            // return res.send(resetSuccessfulHTML(req));
            return res.status(HttpStatus.OK).json({
              message: 'Password reset successful!',
            });
          }
        },
      );
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  async signOut(
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ) {
    try {
      // Extract the user ID from the request object
      const id = req.user?.userId;
      if (!id) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User ID not provided' });
      }

      const user = await this.userService.getUserById(id);
      if (!user)
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'user not found' });

      // Update the user's token to null
      await this.userService.updateUserById(id, { token: null });

      const name = `${user.username}`;

      return res.status(HttpStatus.OK).json({
        message: `${this.toTitleCase(name)} has been signed out successfully`,
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Put('profilePic')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', new FileUploadService().getMulterOptions()),
  )
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ) {
    try {
      // Step 1: Validate User
      const userId = req.user?.userId;
      if (!userId) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User ID not provided' });
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User not found' });
      }

      // Step 2: Validate Uploaded File
      const file = (req as any).file; // Cast `request` to access `file` property
      if (!file) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'No file was uploaded' });
      }

      const filePath = file.path;
      if (!fs.existsSync(filePath)) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Uploaded file not found' });
      }

      // Step 3: Upload to Cloudinary
      let uploadedImage;
      try {
        uploadedImage = await this.cloudinaryService.uploadImage(
          filePath,
          `userPic_${userId}`,
        );
      } catch (error) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          message: `Error uploading to Cloudinary: ${error.message}`,
        });
      } finally {
        // Clean up local file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Step 4: Update or Create Picture Record
      const userPicture = {
        public_id: uploadedImage.public_id,
        url: uploadedImage.secure_url,
      };

      let updatedPicture;
      if (user.userPicture) {
        updatedPicture = await Picture.update(userPicture, {
          where: { id: user.userPicture.id },
          returning: true,
        });
      } else {
        updatedPicture = await Picture.create({
          ...userPicture,
          userId,
        });
      }

      // Step 5: Update User
      const updatedUser = await this.userService.updateUserById(userId, {
        pictureId: updatedPicture.public_id as string,
      });

      if (!updatedUser) {
        return res
          .status(HttpStatus.BAD_GATEWAY)
          .json({ message: 'Unable to update user with new photo' });
      }

      // Return Success Response
      return res.status(HttpStatus.OK).json({
        message: 'Photo successfully uploaded!',
        profilePicture: userPicture,
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Get('get-users')
  @UseGuards(JwtAuthGuard)
  async getUsers(
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ) {
    try {
      // Validate userId from request
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'User ID not provided',
        });
      }

      // Fetch user by ID
      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'User not found',
        });
      }

      // Exclude sensitive fields like password, OTP, etc.
      const { password: _, ...userDetails } = user;

      // Return successful response
      return res.status(HttpStatus.OK).json({
        message: 'User profile successfully fetched!',
        data: userDetails,
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Get('get-all-users')
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Req() req: Request, @Res() res: Response) {
    try {
      const users = await this.userService.getUsers({ createdAt: 'desc' });

      if (!users || users.length === 0) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'No users found' });
      }

      return res.status(HttpStatus.OK).json({
        message: `${users.length} user(s) found`,
        data: users,
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Put('update-user')
  @UseGuards(JwtAuthGuard)
  async updateUserProfile(
    @Body() body: UserData,
    @Req() req: Request & { user: { userId: string } },
    @Res() res: Response,
  ) {
    try {
      // Validate incoming user data
      const { error } = validateUpdatedUser(body);
      if (error) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: error.details[0].message });
      }

      // Extract the user ID from the request object
      const userId = req.user?.userId;
      if (!userId) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User ID not provided' });
      }

      // Fetch the user by ID
      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User not found' });
      }

      // Prepare updated user data
      const userData = {
        username: body.username?.toLowerCase().trim() || user.username,
        email: body.email?.toLowerCase().trim() || user.email,
      };

      // Update the user
      const updatedUser = await this.userService.updateUserById(
        userId,
        userData,
      );
      if (!updatedUser) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Unable to update user profile' });
      }

      // Respond with success message and updated profile data
      return res.status(HttpStatus.OK).json({
        message: 'Your profile has been updated successfully',
        data: updatedUser,
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Delete('delete-user')
  @UseGuards(JwtAuthGuard)
  async deleteUserProfile(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const user = await this.userService.getUserById(id);
      if (!user)
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User not found' });

      const deleteduser: any = await this.userService.deleteUserById(id);
      if (!deleteduser)
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Unable to delete user profile' });

      return res
        .status(HttpStatus.OK)
        .json({ message: 'User profile successfully deleted!' });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }

  @Post('make-admin')
  @UseGuards(JwtAuthGuard)
  async makeAdmin(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = id;
      if (!userId) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: 'User ID not provided' });
      }

      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'User not found',
        });
      }
      const makeAdmin = await this.userService.updateUserById(userId, {
        isAdmin: true,
      });

      const updateAdmin = await Admin.create({ userId });
      if (!updateAdmin)
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Unable to make user an admin' });

      return res.status(HttpStatus.OK).json({
        message: 'User have been made an Admin successfully',
        data: makeAdmin,
      });
    } catch (error: unknown) {
      if (error instanceof Error)
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: `Internal Server Error: ${error.message}`,
        });
    }
  }
}
