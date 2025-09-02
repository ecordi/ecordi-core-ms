import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'template' | 'status';
export type MessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed';

@Schema({ collection: 'messages', timestamps: true })
export class Message {
  @Prop({ required: true })
  messageId!: string; // wamid or status unique key

  @Prop({ required: true })
  direction!: MessageDirection;

  @Prop({ required: true })
  type!: MessageType;

  @Prop()
  from!: string;

  @Prop()
  to!: string;

  @Prop()
  timestamp!: string;

  @Prop({ type: Object })
  content!: any;

  @Prop({ required: true })
  status!: MessageStatus;

  @Prop({ required: true, index: true })
  companyId!: string;

  @Prop({ required: true, index: true })
  connectionRefId!: string;

  @Prop({ required: true })
  phoneNumberId!: string;

  @Prop({
    type: Object,
    default: {},
  })
  media!: {
    pending?: boolean;
    fileId?: string;
    url?: string;
    provider?: 'gcp' | 'cloudinary';
    name?: string;
    mimetype?: string;
    size?: number;
    publicId?: string;
  };

  @Prop({
    type: [Object],
    default: [],
  })
  kbFiles!: Array<{
    fileId: string;
    url: string;
    name: string;
    mimeType: string;
    size: number;
    caption?: string;
    sha256?: string;
  }>;

  @Prop({ type: Object, default: {} })
  metadata!: any;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ messageId: 1 }, { unique: true });
// For status idempotency store statusKey in metadata.statusKey and make unique index
MessageSchema.index({ 'metadata.statusKey': 1 }, { unique: true, partialFilterExpression: { 'metadata.statusKey': { $exists: true } } });
