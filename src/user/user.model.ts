import { Table, Column, Model, DataType, HasOne, HasMany } from 'sequelize-typescript';
import { Picture } from './picture.model';
import { Posts } from '../post/post.model';
import { Comment } from '../comment/comment.model';
import { Like } from '../comment/like.model';
import { Share } from '../comment/share.model';

@Table({ tableName: 'users', timestamps: true })
export class User extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({ type: DataType.STRING, unique: true, allowNull: false })
  username: string;

  @Column({ type: DataType.STRING, unique: true, allowNull: false })
  email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  password: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isAdmin: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isVerified: boolean;

  @Column({ type: DataType.STRING, unique: true, allowNull: true })
  pictureId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  token: string;

  @HasOne(() => Picture, { foreignKey: 'userId', as: 'userPicture' })
  userPicture: Picture;

  @HasMany(() => Posts, { foreignKey: 'authorId' })
  posts: Posts[];

  @HasMany(() => Comment, { foreignKey: 'authorId' })
  comments: Comment[];

  @HasMany(() => Like, { foreignKey: 'userId' })
  likes: Like[];

  @HasMany(() => Share, { foreignKey: 'userId' })
  shares: Share[];
}
