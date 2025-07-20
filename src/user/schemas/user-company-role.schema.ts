import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Company } from '../../company/schemas/company.schema';
import { Role } from '../../role/schemas/role.schema';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class UserCompanyRole extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  company: Company;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Role' }], required: true })
  roles: Role[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  assignedAt: Date;
}

export const UserCompanyRoleSchema = SchemaFactory.createForClass(UserCompanyRole);
