import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop()
  name?: string;

  @Prop()
  email?: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  whatsappName?: string;

  @Prop()
  notes?: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ type: Object })
  metadata?: {
    lastSeen?: Date;
    isWhatsAppUser?: boolean;
    businessAccount?: boolean;
    tags?: string[];
  };

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Indexes for better performance
ContactSchema.index({ companyId: 1, phoneNumber: 1 }, { unique: true });
ContactSchema.index({ companyId: 1, name: 1 });
ContactSchema.index({ phoneNumber: 1 });
