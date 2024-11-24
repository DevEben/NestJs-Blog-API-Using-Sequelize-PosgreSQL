import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { User } from '../../user/user.model'; // Import your Sequelize User model

export interface JwtPayload {
  userId: string;
  isAdmin?: boolean;
  iat: number; // Issued at time
  exp: number; // Expiration time
}

@Injectable()
export class AuthService {
  async validateUser(
    token: string,
  ): Promise<{ userId: string; isAdmin: boolean } | null> {
    try {
      const decodedToken = this.verifyToken(token);
      if (!decodedToken || !decodedToken.userId) {
        return null;
      }

      // Find the user in the database using Sequelize
      const user = await User.findByPk(decodedToken.userId);
      if (!user) {
        return null;
      }

      return { userId: decodedToken.userId, isAdmin: user.isAdmin };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  private verifyToken(token: string): JwtPayload | null {
    const SECRET = process.env.SECRET;
    if (!SECRET) {
      throw new Error('Secret key not defined');
    }

    return jwt.verify(token, SECRET) as JwtPayload;
  }
}
