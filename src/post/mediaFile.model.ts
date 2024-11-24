import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Posts } from './post.model';

@Table({ tableName: 'media_files', timestamps: false })
export class MediaFile extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  url: string;

  @Column({ type: DataType.STRING, allowNull: false })
  public_id: string;

  @ForeignKey(() => Posts)
  @Column({ type: DataType.UUID, allowNull: false })
  postId: string;

  @BelongsTo(() => Posts, { foreignKey: 'postId' })
  post: Posts;
}
