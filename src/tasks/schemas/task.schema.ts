import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TaskDocument = HydratedDocument<Task>;

@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  channelType: string;

  @Prop({ required: true })
  connectionId: string;

  @Prop({ required: true })
  customerId: string;

  @Prop()
  subject?: string;

  @Prop({ default: 'open' })
  status: 'open' | 'closed' | 'archived';

  @Prop({ type: [String], default: [] })
  participants: string[];

  @Prop({ type: Types.ObjectId })
  lastMessageId?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

TaskSchema.index({ companyId: 1, connectionId: 1, customerId: 1 }, { name: 'idx_task_conversation' });
TaskSchema.index({ companyId: 1, status: 1, updatedAt: -1 }, { name: 'idx_task_status' });
