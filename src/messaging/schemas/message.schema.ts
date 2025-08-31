import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'messages', timestamps: true })
export class Message {
  @Prop({ required: true }) companyId: string;
  @Prop({ required: true }) channel: string;
  @Prop({ required: true }) connectionId: string;
  @Prop({ required: true, enum: ['incoming', 'outgoing'] }) direction: 'incoming' | 'outgoing';
  @Prop({ required: true }) senderId: string;
  @Prop({ required: true }) recipientId: string;
  @Prop({ required: true }) type: string;
  @Prop() text?: string;
  @Prop({ type: Array, default: [] }) attachments?: any[];
  @Prop({ type: Object }) place?: any;
  @Prop() remoteId?: string;
  @Prop({ enum: ['queued', 'sent', 'delivered', 'read', 'failed'], default: 'queued' }) status?: string;
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ companyId: 1, connectionId: 1, createdAt: -1 });
