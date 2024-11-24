import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from '../user/user.model';
import { Comment } from '../comment/comment.model';
import { Like } from '../comment/like.model';
import { Share } from '../comment/share.model';
import { MediaFile } from '../post/mediaFile.model';

@Table({ tableName: 'posts', timestamps: true })
export class Posts extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.STRING, allowNull: false })
  content: string;

  @Column({ type: DataType.JSON, allowNull: true })
  shareButtons: any;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  authorId: string;

  @BelongsTo(() => User, { foreignKey: 'authorId', as: 'author' })
  author: User;

  @HasMany(() => MediaFile, { foreignKey: 'postId' })
  mediaFiles: MediaFile[];

  @HasMany(() => Comment, { foreignKey: 'postId' })
  comments: Comment[];

  @HasMany(() => Like, { foreignKey: 'postId' })
  likes: Like[];

  @HasMany(() => Share, { foreignKey: 'postId' })
  shares: Share[];
}
