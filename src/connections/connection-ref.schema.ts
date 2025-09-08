import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConnectionDocument = HydratedDocument<Connection>;

export enum ConnectionStatus {
  PENDING = 'pending',
  CODE_RECEIVED = 'code_received', 
  ACTIVE = 'active',
  ERROR_OAUTH = 'error_oauth',
  ERROR_CHANNEL = 'error_channel'
}

@Schema({ collection: 'connection', timestamps: true })
export class Connection {
  @Prop({ required: true })
  companyId!: string;

  @Prop({ required: true })
  channel!: string; // 'whatsapp_cloud'

  @Prop({ required: true, unique: true })
  connectionId!: string;

  @Prop({ required: true, enum: Object.values(ConnectionStatus), default: ConnectionStatus.PENDING })
  status!: ConnectionStatus;

  @Prop()
  verifyToken?: string;

  @Prop()
  displayName?: string;

  @Prop({ index: true })
  phoneNumberId?: string;

  // Reference to provider-specific connection identifier (e.g., Instagram business account id)
  @Prop({ index: true })
  connectionRefId?: string;

  // Optional page id (for Facebook/Instagram)
  @Prop({ index: true })
  pageId?: string;
}

export const ConnectionSchema = SchemaFactory.createForClass(Connection);
