import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../user/user.model';
import { Picture } from '../user/picture.model';
import { Sequelize } from 'sequelize-typescript';

// Define a type that excludes the password
export type UserWithoutPassword = Omit<User, 'password'>;

export type CreateUserDto = Pick<User, 'username' | 'email' | 'password'>;

@Injectable()
export class UserService {
  constructor(private readonly sequelize: Sequelize) {}

  private get userModel() {
    return this.sequelize.model(User) as typeof User;
  }

  // Create a User
  async createUser(data: CreateUserDto): Promise<User> {
    return await this.userModel.create({data});
  }

  // Get One User by ID
  async getUserById(id: string): Promise<User | null> {
    const user = await this.userModel.findOne({
      where: { id },
      include: [{ model: Picture, as: 'userPicture' }],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Get One User by Email
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await this.userModel.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // Get All Users with optional sorting and selection
  async getUsers(orderBy?: { createdAt?: 'asc' | 'desc' }): Promise<UserWithoutPassword[]> {
    const users = await this.userModel.findAll({
      order: orderBy?.createdAt ? [['createdAt', orderBy.createdAt]] : undefined,
      attributes: { exclude: ['password'] },
    });

    return users;
  }

  // Update User by ID
  async updateUserById(id: string, data: Partial<User>): Promise<User> {
    const [affectedRows, [updatedUser]] = await this.userModel.update(data, {
      where: { id },
      returning: true,
      individualHooks: true, // Optional: Ensures hooks like validations run during update
    });

    if (affectedRows === 0) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  // Delete User by ID
  async deleteUserById(id: string): Promise<void> {
    const user = await this.userModel.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await user.destroy();
  }

  // Get User with Picture by ID
  async userWithPicture(id: string): Promise<User | null> {
    const user = await this.userModel.findOne({
      where: { id },
      include: [{ model: Picture, as: 'userPicture' }],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
