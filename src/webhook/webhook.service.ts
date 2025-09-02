import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyMetaSignature } from '../common/hmac.util';
import { ConnectionsService } from '../connections/connections.service';
import { EventsService } from '../events/events.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from '../messaging/schemas/message.schema';
import { MediaQueueService } from '../workers/workers.queue';
import type { MediaDownloadJob } from '../workers/workers.queue';

// Type guard to narrow WhatsApp media message types
const MEDIA_TYPES = ['image', 'audio', 'video', 'document', 'sticker'] as const;
function isMediaType(t: string): t is MediaDownloadJob['type'] {
  return (MEDIA_TYPES as readonly string[]).includes(t);
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  constructor(
    private readonly config: ConfigService,
    private readonly connections: ConnectionsService,
    private readonly events: EventsService,
    private readonly mediaQueue: MediaQueueService,
    @InjectModel(Message.name) private readonly msgModel: Model<MessageDocument>,
  ) {}

  verifyToken(token: string): boolean {
    const expected = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    return !!expected && token === expected;
  }

  verifySignature(rawBody: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>('WHATSAPP_APP_SECRET') || '';
    return verifyMetaSignature(rawBody, signature, secret);
  }

  async processWebhook(body: any) {
    if (!body?.entry) return;

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        const conn = await this.connections.findByPhoneNumberId(phoneNumberId);
        if (!conn) {
          this.logger.warn(`No active connection for phoneNumberId=${phoneNumberId}`);
          continue;
        }

        // Messages
        for (const msg of value.messages || []) {
          await this.handleIncomingMessage(conn.companyId, conn.connectionId, phoneNumberId, value, msg);
        }

        // Statuses
        for (const st of value.statuses || []) {
          await this.handleStatus(conn.companyId, conn.connectionId, phoneNumberId, st);
        }
      }
    }
  }

  private async handleIncomingMessage(companyId: string, connectionRefId: string, phoneNumberId: string, value: any, msg: any) {
    const wamid = msg.id || msg.wamid;
    if (!wamid) return;

    const type = msg.type as string;
    const from = msg.from;
    const to = phoneNumberId;
    const timestamp = msg.timestamp || String(Math.floor(Date.now() / 1000));

    const content: any = {};
    let media: any = {};
    if (type === 'text') {
      content.text = msg.text?.body;
    } else if (isMediaType(type)) {
      const mediaObj = msg[type];
      if (mediaObj?.id) {
        media = { pending: true };
        await this.mediaQueue.enqueueDownload({
          mediaId: mediaObj.id,
          companyId,
          connectionRefId,
          phoneNumberId,
          messageId: wamid,
          type,
        });
      }
      content[type] = { id: mediaObj?.id, mime_type: mediaObj?.mime_type, sha256: mediaObj?.sha256, caption: mediaObj?.caption, filename: mediaObj?.filename };
    } else {
      content[type] = msg[type];
    }

    try {
      await this.msgModel.updateOne(
        { messageId: wamid },
        {
          $setOnInsert: {
            messageId: wamid,
            direction: 'incoming',
            type,
            from,
            to,
            timestamp,
            content,
            status: 'received',
            companyId,
            connectionRefId,
            phoneNumberId,
            media,
            metadata: { contact: (value.contacts || [])[0] || {} },
          },
        },
        { upsert: true },
      );
    } catch (e: any) {
      // Duplicate insert is ok due to idempotency
    }

    this.events.messageReceived(companyId, { id: wamid, type, from, to });
  }

  private async handleStatus(companyId: string, connectionRefId: string, phoneNumberId: string, st: any) {
    const statusKey = `${st.id || ''}:${st.status || ''}:${st.timestamp || ''}`;
    try {
      await this.msgModel.updateOne(
        { 'metadata.statusKey': statusKey },
        {
          $setOnInsert: {
            messageId: `status_${statusKey}`,
            direction: 'incoming',
            type: 'status',
            from: st.recipient_id || '',
            to: phoneNumberId,
            timestamp: st.timestamp || String(Math.floor(Date.now() / 1000)),
            content: st,
            status: (st.status as any) || 'received',
            companyId,
            connectionRefId,
            phoneNumberId,
            media: {},
            metadata: { statusKey },
          },
        },
        { upsert: true },
      );
    } catch (e: any) {
      // ignore duplicate
    }

    this.events.messageStatus(companyId, { id: st.id, status: st.status, timestamp: st.timestamp });
  }
}
