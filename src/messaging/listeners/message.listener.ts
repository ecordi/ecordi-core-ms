import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MessagesService } from '../services/messages.service';
import { ThreadsService } from '../services/threads.service';
import { 
  NatsInboundMessagePayload, 
  NatsMessageStatusPayload, 
  NatsThreadPayload,
  NatsMessageResponse,
  NatsThreadResponse 
} from '../interfaces/nats-contracts.interface';

@Injectable()
export class MessageListener {
  private readonly logger = new Logger(MessageListener.name);

  constructor(
    private messagesService: MessagesService,
    private threadsService: ThreadsService,
  ) {}

  /**
   * Handle incoming messages from WhatsApp Channel
   */
  @MessagePattern('channel.whatsapp.message.received')
  async handleWhatsAppMessageReceived(@Payload() payload: NatsInboundMessagePayload): Promise<NatsMessageResponse> {
    try {
      this.logger.log(`Received WhatsApp message: ${payload.messageId}`);

      // Ensure thread exists
      let threadId = payload.threadId;
      if (!threadId) {
        const threadPayload: NatsThreadPayload = {
          threadId: '', // Will be generated
          companyId: payload.companyId,
          type: 'dm', // WhatsApp messages are DMs
          channelType: payload.channelType,
          connectionId: payload.connectionId,
          externalUserId: payload.fromId,
          metadata: payload.metadata,
        };

        const thread = await this.threadsService.findOrCreateThread(threadPayload);
        threadId = thread.threadId;
        payload.threadId = threadId;
      }

      // Create or update the message
      const message = await this.messagesService.upsertInboundMessage(payload);

      return {
        success: true,
        messageId: message.messageId,
        threadId: message.threadId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle WhatsApp message: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Handle message status updates from WhatsApp Channel
   */
  @MessagePattern('channel.whatsapp.message.status')
  async handleWhatsAppMessageStatus(@Payload() payload: NatsMessageStatusPayload): Promise<NatsMessageResponse> {
    try {
      this.logger.log(`Received WhatsApp message status: ${payload.messageId} -> ${payload.status}`);

      const message = await this.messagesService.updateMessageStatus(payload);

      return {
        success: true,
        messageId: message.messageId,
        threadId: message.threadId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle WhatsApp message status: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Handle thread creation from WhatsApp Channel
   */
  @MessagePattern('channel.whatsapp.thread.created')
  async handleWhatsAppThreadCreated(@Payload() payload: NatsThreadPayload): Promise<NatsThreadResponse> {
    try {
      this.logger.log(`Received WhatsApp thread creation: ${payload.externalUserId}`);

      const thread = await this.threadsService.findOrCreateThread(payload);

      return {
        success: true,
        threadId: thread.threadId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle WhatsApp thread creation: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Generic handler for other channel types (email, etc.)
   */
  @MessagePattern('channel.*.message.received')
  async handleGenericMessageReceived(@Payload() payload: NatsInboundMessagePayload): Promise<NatsMessageResponse> {
    try {
      this.logger.log(`Received generic message: ${payload.messageId} from ${payload.channelType}`);

      // Ensure thread exists
      let threadId = payload.threadId;
      if (!threadId) {
        const threadPayload: NatsThreadPayload = {
          threadId: '', // Will be generated
          companyId: payload.companyId,
          type: 'dm', // Default to DM for generic channels
          channelType: payload.channelType,
          connectionId: payload.connectionId,
          externalUserId: payload.fromId,
          metadata: payload.metadata,
        };

        const thread = await this.threadsService.findOrCreateThread(threadPayload);
        threadId = thread.threadId;
        payload.threadId = threadId;
      }

      // Create or update the message
      const message = await this.messagesService.upsertInboundMessage(payload);

      return {
        success: true,
        messageId: message.messageId,
        threadId: message.threadId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle generic message: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Generic handler for message status updates from other channels
   */
  @MessagePattern('channel.*.message.status')
  async handleGenericMessageStatus(@Payload() payload: NatsMessageStatusPayload): Promise<NatsMessageResponse> {
    try {
      this.logger.log(`Received generic message status: ${payload.messageId} -> ${payload.status}`);

      const message = await this.messagesService.updateMessageStatus(payload);

      return {
        success: true,
        messageId: message.messageId,
        threadId: message.threadId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle generic message status: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Generic handler for thread creation from other channels
   */
  @MessagePattern('channel.*.thread.created')
  async handleGenericThreadCreated(@Payload() payload: NatsThreadPayload): Promise<NatsThreadResponse> {
    try {
      this.logger.log(`Received generic thread creation: ${payload.externalUserId} from ${payload.channelType}`);

      const thread = await this.threadsService.findOrCreateThread(payload);

      return {
        success: true,
        threadId: thread.threadId,
      };
    } catch (error) {
      this.logger.error(`Failed to handle generic thread creation: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }
}
