import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'comments', timestamps: true })
export class Comment {
  @Prop({ required: true }) companyId: string;
  @Prop({ required: true }) channel: string;
  @Prop({ required: true }) connectionId: string;
  @Prop({ required: true }) conversationId: string;
  @Prop({ required: true }) authorId: string;
  @Prop({ required: true }) authorDisplayName: string;
  @Prop({ required: true }) body: string;
  @Prop({ type: Array, default: [] }) attachments?: any[];
  @Prop({ type: Object }) place?: any;
  @Prop() remoteId?: string;
}

export type CommentDocument = HydratedDocument<Comment>;
export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ companyId: 1, conversationId: 1, createdAt: -1 });
