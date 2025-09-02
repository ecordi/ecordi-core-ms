import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebhookEventDocument = WebhookEvent & Document;

@Schema({
  timestamps: true,
  collection: 'webhook_events',
})
export class WebhookEvent {
  @Prop({ required: true, index: true })
  channel: string;

  @Prop({ required: true, index: true })
  remoteId: string;

  @Prop({ required: true, index: true })
  companyId: string;

  @Prop({ required: true })
  receivedAt: Date;

  @Prop({ type: Object, required: true })
  rawPayload: any;

  @Prop({ default: 'pending', enum: ['pending', 'processed', 'failed'] })
  status: string;

  @Prop()
  processedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 0 })
  retryCount: number;
}

export const WebhookEventSchema = SchemaFactory.createForClass(WebhookEvent);

// Compound unique index for idempotency
WebhookEventSchema.index(
  { channel: 1, remoteId: 1, companyId: 1 },
  { unique: true, name: 'webhook_event_idempotency' }
);

// Index for cleanup queries
WebhookEventSchema.index(
  { receivedAt: 1 },
  { name: 'webhook_event_cleanup' }
);

// Index for status queries
WebhookEventSchema.index(
  { status: 1, receivedAt: 1 },
  { name: 'webhook_event_status' }
);
