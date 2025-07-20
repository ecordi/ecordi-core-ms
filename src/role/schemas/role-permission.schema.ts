import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Role } from './role.schema';
import { Permission } from '../../permission/schemas/permission.schema';

@Schema({ timestamps: true })
export class RolePermission extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Role', required: true })
  role: Role;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Permission', required: true })
  permission: Permission;

  @Prop({ default: true })
  isActive: boolean;
}

export const RolePermissionSchema = SchemaFactory.createForClass(RolePermission);
