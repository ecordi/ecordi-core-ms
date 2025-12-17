import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CoreConnectionDocument = CoreConnection & Document;

export enum ConnectionStatus {
  PENDING = 'pending',
  CODE_RECEIVED = 'code_received',
  ACTIVE = 'active',
  ERROR_OAUTH = 'error_oauth',
  ERROR_CHANNEL = 'error_channel'
}

export enum ConnectionProvider {
  WHATSAPP_CLOUD = 'whatsapp_cloud',
  INSTAGRAM = 'instagram'
}

@Schema({ timestamps: true })
export class CoreConnection {
  @Prop({ required: true, unique: true })
  connectionId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  provider: ConnectionProvider;

  @Prop({ required: true, enum: ConnectionStatus, default: ConnectionStatus.PENDING })
  status: ConnectionStatus;

  // WhatsApp Cloud specific fields
  @Prop({ required: false })
  phoneNumberId?: string;

  @Prop({ required: false })
  wabaId?: string;

  @Prop({ required: false })
  appId?: string;

  @Prop({ required: false })
  appSecret?: string;

  @Prop({ required: false })
  verifyToken?: string;

  @Prop({ required: false })
  displayName?: string;

  @Prop({ required: false })
  customChannelName?: string;

  // OAuth tokens
  @Prop({ required: false })
  shortLivedToken?: string;

  @Prop({ required: false })
  shortLivedExpiresIn?: number;

  @Prop({ required: false })
  longLivedToken?: string;

  @Prop({ required: false })
  longLivedExpiresIn?: number;

  // Error tracking
  @Prop({ required: false })
  errorMessage?: string;

  @Prop({ required: false })
  errorDetails?: string;

  @Prop({ required: false })
  lastErrorAt?: Date;

  // Metadata
  @Prop({ required: false })
  redirectUri?: string;

  @Prop({ required: false })
  state?: string;

  @Prop({ required: false })
  stateHmac?: string;

  // Generic metadata field for provider-specific data
  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>;

  // Timestamps
  @Prop({ required: false })
  createdAt?: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const CoreConnectionSchema = SchemaFactory.createForClass(CoreConnection);
