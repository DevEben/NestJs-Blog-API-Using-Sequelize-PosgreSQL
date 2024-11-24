import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../user/user.model';
import { Posts } from '../post/post.model';

@Table({ tableName: 'likes', timestamps: true })
export class Like extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => Posts)
  @Column({ type: DataType.UUID, allowNull: false })
  postId: string;

  @BelongsTo(() => Posts, { foreignKey: 'postId' })
  post: Posts;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @BelongsTo(() => User, { foreignKey: 'userId' })
  user: User;
}
