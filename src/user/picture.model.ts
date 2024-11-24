import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'pictures', timestamps: false })
export class Picture extends Model {
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

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, unique: true, allowNull: true })
  userId: string;

  @BelongsTo(() => User, { foreignKey: 'userId', as: 'user' })
  user: User;
}
