import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class CloudinaryService {
  constructor() {
    // Configure Cloudinary using environment variables
    cloudinary.config({
      cloud_name: process.env.CLOUD_NAME as string,
      api_key: process.env.API_KEY as string,
      api_secret: process.env.API_SECRET as string,
    });
  }

  /**
   * Uploads an image to Cloudinary.
   * @param filePath - The local file path of the image to be uploaded.
   * @param name - A descriptive name to categorize the image.
   * @returns Details of the uploaded image.
   */
  async uploadImage(filePath: string, name: string) {
    try {
      const uploadOptions = {
        public_id: `${name}_${Date.now()}`, // Use timestamp for unique naming
        folder: `${name}-Images`,
      };

      // Upload the image to Cloudinary
      const uploadedFile = await cloudinary.uploader.upload(filePath, uploadOptions);
      return uploadedFile;
    } catch (error) {
      if (error instanceof Error) {
        // Handle errors gracefully
        throw new Error(`Error uploading photo to Cloudinary: ${error.message}`);
      }
      throw new Error('Error uploading photo to Cloudinary: An unknown error occurred.');
    }
  }


  /**
   * Deletes an image from Cloudinary.
   * @param publicId - The `public_id` of the image to be deleted from Cloudinary.
   * @returns Details of the deletion result.
   */
  async deleteImage(publicId: string) {
    try {
       // Use Cloudinary's destroy method to delete the image by its public_id
       const result = await cloudinary.uploader.destroy(publicId);

       // Check if the deletion was successful
       if (result.result !== 'ok') {
         throw new Error(`Failed to delete image. Cloudinary response: ${result.result}`);
       }
 
       return result; // Return the result from Cloudinary

   } catch (error) {
      if (error instanceof Error) {
        // Handle errors gracefully
        throw new Error(`Error deleting photo from Cloudinary: ${error.message}`);
      }
      throw new Error('Error deleting photo from Cloudinary: An unknown error occurred.');
    }
  }
}
