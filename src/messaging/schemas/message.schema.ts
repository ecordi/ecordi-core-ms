import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true })
  taskId: Types.ObjectId;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  channelType: string;

  @Prop({ required: true })
  connectionId: string;

  @Prop({ required: true, enum: ['inbound', 'outbound', 'internal'] })
  direction: 'inbound' | 'outbound' | 'internal';

  @Prop({ required: true })
  messageId: string;

  @Prop()
  remoteId?: string;

  @Prop({ required: true, enum: ['text','image','audio','video','document','location','contact','interactive','template'] })
  type: string;

  @Prop()
  body?: string;

  @Prop({ type: Array, default: [] })
  kbFiles: Array<{
    fileId: string;
    url: string;
    name?: string;
    mimeType?: string;
    size?: number;
    caption?: string;
    sha256?: string;
  }>;

  @Prop({ default: 'received' })
  status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';

  @Prop({ type: Object })
  raw?: any;

  @Prop()
  fromId?: string;

  @Prop()
  toId?: string;

  @Prop({ type: Date })
  providerTimestamp?: Date;

  @Prop({ default: false })
  isInternal: boolean;

  @Prop()
  createdByUserId?: string;

  // Mongoose timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index(
  { connectionId: 1, remoteId: 1 },
  { unique: true, partialFilterExpression: { remoteId: { $type: 'string' } }, name: 'uniq_connection_remote' }
);

MessageSchema.index(
  { messageId: 1 },
  { unique: true, partialFilterExpression: { messageId: { $type: 'string' } }, name: 'uniq_messageId' }
);

MessageSchema.index({ taskId: 1, createdAt: 1 }, { name: 'idx_task_time' });
MessageSchema.index({ companyId: 1, connectionId: 1, createdAt: -1 }, { name: 'idx_conn_time' });

