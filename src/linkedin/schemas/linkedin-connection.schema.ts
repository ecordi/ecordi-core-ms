import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LinkedInConnectionDocument = LinkedInConnection & Document;

@Schema({ 
  timestamps: true,
  collection: 'linkedin_connections'
})
export class LinkedInConnection {
  @Prop({ required: true, unique: true })
  connectionId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop()
  displayName: string;

  @Prop()
  memberId: string;

  @Prop()
  pictureProfile: string;

  @Prop()
  refreshToken: string;

  @Prop()
  refreshTokenExpiration: string;

  @Prop({ required: true })
  token: string;

  @Prop()
  tokenExpiration: string;

  @Prop()
  userId: string;

  @Prop({
    type: [{
      _id: false,
      type: { type: String, required: true },
      action: { type: String, required: true },
      params: {
        headers: { type: Object }
      }
    }],
    default: []
  })
  webhooks: Array<{
    type: string;
    action: string;
    params: {
      headers?: Record<string, any>;
    };
  }>;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const LinkedInConnectionSchema = SchemaFactory.createForClass(LinkedInConnection);

// Indexes
LinkedInConnectionSchema.index({ token: 1 });
LinkedInConnectionSchema.index({ connectionId: 1 });
LinkedInConnectionSchema.index({ companyId: 1 });
LinkedInConnectionSchema.index({ memberId: 1 });
