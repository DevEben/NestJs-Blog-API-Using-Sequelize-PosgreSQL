import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../user/user.model';
import { Posts } from '../post/post.model';

@Table({ tableName: 'comments', timestamps: true })
export class Comment extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  content: string;

  @ForeignKey(() => Posts)
  @Column({ type: DataType.UUID, allowNull: false })
  postId: string;

  @BelongsTo(() => Posts, { foreignKey: 'postId' })
  post: Posts;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  authorId: string;

  @BelongsTo(() => User, { foreignKey: 'authorId' })
  author: User;
}
