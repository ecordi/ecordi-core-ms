import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ThreadDocument = Thread & Document;

export enum ThreadType {
  DM = 'dm',
  FEED_COMMENT = 'feed_comment'
}

export enum ThreadStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

@Schema({ timestamps: true })
export class Thread {
  @Prop({ required: true, unique: true })
  threadId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true, enum: ThreadType })
  type: ThreadType;

  @Prop({ required: true, enum: ThreadStatus, default: ThreadStatus.ACTIVE })
  status: ThreadStatus;

  // Channel information
  @Prop({ required: true })
  channelType: string; // 'whatsapp_cloud', 'email', etc.

  @Prop({ required: true })
  connectionId: string;

  // Participants
  @Prop({ required: true })
  externalUserId: string; // WhatsApp phone number, email address, etc.

  @Prop({ required: false })
  internalUserId?: string; // Internal user handling the thread

  // Thread metadata
  @Prop({ required: false })
  subject?: string;

  @Prop({ required: false })
  tags?: string[];

  @Prop({ required: false })
  priority?: number; // 1-5, where 5 is highest

  // Timestamps
  @Prop({ required: false })
  lastMessageAt?: Date;

  @Prop({ required: false })
  closedAt?: Date;

  @Prop({ required: false })
  archivedAt?: Date;

  // Feed-specific fields (for feed comments)
  @Prop({ required: false })
  feedPostId?: string;

  @Prop({ required: false })
  parentCommentId?: string;

  // Metadata
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;
}

export const ThreadSchema = SchemaFactory.createForClass(Thread);

// Indexes for performance
ThreadSchema.index({ companyId: 1, status: 1, lastMessageAt: -1 });
ThreadSchema.index({ connectionId: 1, externalUserId: 1 });
ThreadSchema.index({ threadId: 1 }, { unique: true });
ThreadSchema.index({ feedPostId: 1, parentCommentId: 1 });
