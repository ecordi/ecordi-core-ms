import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive',
  SYSTEM = 'system'
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop({ required: true })
  threadId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true, enum: MessageDirection })
  direction: MessageDirection;

  @Prop({ required: true, enum: MessageType })
  type: MessageType;

  @Prop({ required: true, enum: MessageStatus, default: MessageStatus.PENDING })
  status: MessageStatus;

  // Channel information
  @Prop({ required: true })
  channelType: string; // 'whatsapp_cloud', 'email', etc.

  @Prop({ required: true })
  connectionId: string;

  // Message content
  @Prop({ required: false })
  text?: string;

  @Prop({ required: false })
  mediaUrl?: string;

  @Prop({ required: false })
  mediaType?: string; // MIME type

  @Prop({ required: false })
  mediaCaption?: string;

  @Prop({ required: false })
  fileName?: string;

  @Prop({ required: false })
  fileSize?: number;

  // Sender/Recipient information
  @Prop({ required: true })
  fromId: string; // External user ID or internal user ID

  @Prop({ required: true })
  toId: string; // External user ID or internal user ID

  @Prop({ required: false })
  fromName?: string;

  @Prop({ required: false })
  toName?: string;

  // Channel-specific message IDs
  @Prop({ required: false })
  externalMessageId?: string; // WhatsApp message ID, email message ID, etc.

  @Prop({ required: false })
  replyToMessageId?: string; // ID of message being replied to

  // Template-specific fields
  @Prop({ required: false })
  templateName?: string;

  @Prop({ required: false })
  templateLanguage?: string;

  @Prop({ type: Object, required: false })
  templateParameters?: Record<string, any>;

  // Interactive message fields
  @Prop({ type: Object, required: false })
  interactiveData?: Record<string, any>;

  // Location fields
  @Prop({ required: false })
  latitude?: number;

  @Prop({ required: false })
  longitude?: number;

  @Prop({ required: false })
  locationName?: string;

  @Prop({ required: false })
  locationAddress?: string;

  // Contact fields
  @Prop({ type: Object, required: false })
  contactData?: Record<string, any>;

  // Status tracking
  @Prop({ required: false })
  sentAt?: Date;

  @Prop({ required: false })
  deliveredAt?: Date;

  @Prop({ required: false })
  readAt?: Date;

  @Prop({ required: false })
  failedAt?: Date;

  @Prop({ required: false })
  errorMessage?: string;

  // Metadata
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  @Prop({ type: Object, required: false })
  rawPayload?: Record<string, any>; // Store original channel payload for debugging
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for performance
MessageSchema.index({ threadId: 1, createdAt: -1 });
MessageSchema.index({ companyId: 1, createdAt: -1 });
MessageSchema.index({ messageId: 1 }, { unique: true });
MessageSchema.index({ externalMessageId: 1, channelType: 1 });
MessageSchema.index({ status: 1, direction: 1 });
MessageSchema.index({ connectionId: 1, createdAt: -1 });
