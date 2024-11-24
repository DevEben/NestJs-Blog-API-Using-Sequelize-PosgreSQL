import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from '../user/user.model';

@Table({ tableName: 'admins', timestamps: true })
export class Admin extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, unique: true, allowNull: false })
  userId: string;

  @BelongsTo(() => User, { foreignKey: 'userId' })
  user: User;
}
