import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LinkedInPostDocument = LinkedInPost & Document;

@Schema({ 
  timestamps: true,
  collection: 'linkedin_posts'
})
export class LinkedInPost {
  @Prop({ required: true })
  postId: string;

  @Prop({ required: true })
  connectionId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  type: string; // 'FEED' or 'COMMENT'

  @Prop()
  content: string;

  @Prop()
  mediaUrl: string;

  @Prop()
  mediaType: string;

  @Prop()
  parentPostId: string; // For comments

  @Prop({ default: 'pending' })
  status: string; // pending, sent, failed

  @Prop({ type: Object })
  linkedInResponse?: Record<string, any>;

  @Prop()
  errorMessage: string;

  @Prop({ default: Date.now })
  scheduledAt: Date;

  @Prop()
  sentAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LinkedInPostSchema = SchemaFactory.createForClass(LinkedInPost);

// Indexes
LinkedInPostSchema.index({ postId: 1 });
LinkedInPostSchema.index({ connectionId: 1 });
LinkedInPostSchema.index({ companyId: 1 });
LinkedInPostSchema.index({ status: 1 });
LinkedInPostSchema.index({ createdAt: -1 });
