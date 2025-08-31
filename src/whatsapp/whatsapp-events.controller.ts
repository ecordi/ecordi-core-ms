import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConnectionsService } from '../connections/connections.service';
import { Message, MessageDocument } from '../messaging/schemas/message.schema';
import { Comment, CommentDocument } from '../comments/schemas/comment.schema';

@Controller()
export class WhatsappEventsController {
  constructor(
    private readonly connections: ConnectionsService,
    @InjectModel(Message.name) private readonly msgModel: Model<MessageDocument>,
    @InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>,
  ) {}

  @EventPattern('whatsapp.connection.created')
  async onCreated(@Payload() p: { connectionId: string; companyId: string }) {
    await this.connections.setActive(p.connectionId);
  }

  @EventPattern('whatsapp.connection.failed')
  async onFailed(@Payload() p: { connectionId: string; companyId: string }) {
    await this.connections.setFailed(p.connectionId);
  }

  @EventPattern('whatsapp.incoming.message')
  async onIncoming(@Payload() payload: any) {
    const connection = await this.findConnection(payload.connectionId);
    if (!connection) return;

    const m = payload.data?.message;
    const meta = payload.data?.metadata;
    const text = m?.text?.body || m?.body || '';
    const attachments = payload.data?.attachments || [];
    const place = payload.data?.place;

    const saved = await this.msgModel.create({
      companyId: connection.companyId,
      channel: connection.channel,
      connectionId: connection.connectionId,
      direction: 'incoming',
      senderId: payload.data?.contact?.wa_id || '',
      recipientId: meta?.display_phone_number || '',
      type: m?.type || 'text',
      text,
      attachments,
      place,
      status: 'queued',
    });

    await this.commentModel.create({
      companyId: connection.companyId,
      channel: connection.channel,
      connectionId: connection.connectionId,
      conversationId: this.buildConversationId(payload.data?.contact?.wa_id, meta?.display_phone_number),
      authorId: payload.data?.contact?.wa_id || '',
      authorDisplayName: payload.data?.contact?.profile?.name || 'WhatsApp User',
      body: text,
      attachments,
      place,
      remoteId: saved._id.toString(),
    });
  }

  @EventPattern('whatsapp.message.status')
  async onStatus(@Payload() payload: any) {
    const conn = await this.findConnection(payload.connectionId);
    if (!conn) return;
    const status = payload.statusMessage?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
    const remoteId = status?.id;
    const state = status?.status;
    if (remoteId && state) {
      await this.msgModel.updateOne({ remoteId, companyId: conn.companyId }, { $set: { status: this.mapState(state) } });
    }
  }

  private async findConnection(connectionId: string) {
    return this.connections['connModel'].findOne({ connectionId }).lean().exec();
  }

  private buildConversationId(userWaId?: string, display?: string) {
    return `${userWaId || 'unknown'}:${display || 'unknown'}`;
  }

  private mapState(s: string) {
    if (s === 'sent') return 'sent';
    if (s === 'delivered') return 'delivered';
    if (s === 'read') return 'read';
    if (s === 'failed') return 'failed';
    return 'queued';
  }
}
