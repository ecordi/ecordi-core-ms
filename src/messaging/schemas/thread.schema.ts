import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ThreadDocument = Thread & Document;

@Schema({ timestamps: true })
export class Thread {
  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  channel: string;

  @Prop({ required: true })
  connectionId: string;

  @Prop({ required: true })
  remoteThreadId: string;

  @Prop({ required: true })
  contactId: string;

  @Prop()
  contactName?: string;

  @Prop()
  contactPhone?: string;

  @Prop()
  contactEmail?: string;

  @Prop({ index: true })
  taskId?: string;

  @Prop({ enum: ['dm', 'task', 'group'], default: 'dm' })
  type: 'dm' | 'task' | 'group';

  @Prop({ default: 0 })
  messageCount: number;

  @Prop()
  lastMessageText?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: 'active' })
  status: 'active' | 'archived' | 'closed';

  @Prop()
  lastMessageAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ThreadSchema = SchemaFactory.createForClass(Thread);

ThreadSchema.index({ companyId: 1, taskId: 1 });
ThreadSchema.index({ companyId: 1, contactId: 1 });
ThreadSchema.index({ companyId: 1, status: 1, lastMessageAt: -1 });
ThreadSchema.index({ remoteThreadId: 1, connectionId: 1 });
