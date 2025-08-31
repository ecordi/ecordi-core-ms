import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NatsTransportService } from '../transports/nats-transport.service';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly natsTransportService: NatsTransportService,
    @InjectModel(Message.name) private readonly msgModel: Model<MessageDocument>,
  ) {}

  async send(body: { companyId: string; connectionId: string; senderId: string; recipientId: string; messages: Array<{ type: string; text?: string; template?: any }>; source?: string }) {
    const saved = await this.msgModel.create({
      companyId: body.companyId,
      channel: 'whatsapp_cloud',
      connectionId: body.connectionId,
      direction: 'outgoing',
      senderId: body.senderId,
      recipientId: body.recipientId,
      type: body.messages[0]?.type || 'text',
      text: body.messages[0]?.text || '',
      status: 'queued',
    });

    const result = await this.natsTransportService.send('whatsapp.send', {
      connectionId: body.connectionId,
      senderId: body.senderId,
      recipientId: body.recipientId,
      messages: body.messages,
      source: body.source || 'manual',
    }) as { success: boolean; data: any[]; remoteIds: string[] };

    if (result?.remoteIds?.length) {
      await this.msgModel.updateOne({ _id: saved._id }, { $set: { remoteId: result.remoteIds[0], status: 'sent' } });
    }

    return { success: true, queuedId: saved._id.toString(), remoteIds: result?.remoteIds || [] };
  }

  async sendText(
    connectionId: string,
    recipientId: string,
    message: string,
  ): Promise<any> {
    this.logger.log(`Sending text message to ${recipientId} via connection ${connectionId}`);
    
    try {
      const payload = {
        connectionId,
        recipientId,
        message: {
          type: 'text',
          text: { body: message }
        }
      };

      // Send via NATS to WhatsApp Channel MS
      const result = await this.natsTransportService.send('send_whatsapp_message', payload);
      
      this.logger.log(`Message sent successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  async sendTemplate(
    connectionId: string,
    recipientId: string,
    templateName: string,
    templateParams: any[] = [],
  ): Promise<any> {
    this.logger.log(`Sending template ${templateName} to ${recipientId} via connection ${connectionId}`);
    
    try {
      const payload = {
        connectionId,
        recipientId,
        message: {
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'es' },
            components: templateParams.length > 0 ? [
              {
                type: 'body',
                parameters: templateParams.map(param => ({ type: 'text', text: param }))
              }
            ] : []
          }
        }
      };

      // Send via NATS to WhatsApp Channel MS
      const result = await this.natsTransportService.send('send_whatsapp_message', payload);
      
      this.logger.log(`Template sent successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to send template: ${error.message}`);
      throw error;
    }
  }
}
