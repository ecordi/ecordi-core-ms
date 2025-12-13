import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LinkedInEventDocument = LinkedInEvent & Document;

@Schema({ 
  timestamps: true,
  collection: 'linkedin_events'
})
export class LinkedInEvent {
  @Prop({ required: true })
  eventId: string;

  @Prop({ required: true })
  connectionId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  type: string; // ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS, etc.

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  event: Record<string, any>; // Raw LinkedIn event data

  @Prop({ default: false })
  processed: boolean;

  @Prop({ default: false })
  delivered: boolean;

  @Prop()
  processedAt: Date;

  @Prop()
  errorMessage: string;

  @Prop({
    type: [
      {
        webhookType: { type: String },
        status: { type: String },
        response: { type: MongooseSchema.Types.Mixed },
        sentAt: { type: Date },
      },
    ],
    default: [],
  })
  webhookResponses: Array<{
    webhookType: string;
    status: string;
    response: Record<string, any>;
    sentAt: Date;
  }>;

  @Prop({ default: Date.now })
  receivedAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LinkedInEventSchema = SchemaFactory.createForClass(LinkedInEvent);

// Indexes
LinkedInEventSchema.index({ eventId: 1 });
LinkedInEventSchema.index({ connectionId: 1 });
LinkedInEventSchema.index({ companyId: 1 });
LinkedInEventSchema.index({ type: 1 });
LinkedInEventSchema.index({ processed: 1 });
LinkedInEventSchema.index({ receivedAt: -1 });
