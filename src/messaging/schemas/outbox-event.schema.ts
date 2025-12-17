import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OutboxEventDocument = OutboxEvent & Document;

export type OutboxStatus = 'pending' | 'published' | 'failed';
export type OutboxKind = 'received' | 'status' | 'generic';

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })
export class OutboxEvent {
  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  channel: string; // e.g., whatsapp

  @Prop({ required: true })
  connectionId: string;

  @Prop({ required: false })
  remoteId?: string; // for msg-id construction

  @Prop({ required: true, enum: ['received', 'status', 'generic'], default: 'generic' })
  kind: OutboxKind;

  @Prop({ type: Object, required: true })
  payload: any;

  @Prop({ type: Object, required: false })
  headers?: Record<string, string>;

  @Prop({ required: true, enum: ['pending', 'published', 'failed'], default: 'pending' })
  status: OutboxStatus;

  @Prop({ required: true, default: 0 })
  retryCount: number;

  @Prop({ type: Date, required: true, default: () => new Date() })
  nextAttemptAt: Date;

  @Prop({ required: false })
  error?: string;

  @Prop({ required: false })
  subjectOverride?: string;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

OutboxEventSchema.index({ status: 1, nextAttemptAt: 1 });
