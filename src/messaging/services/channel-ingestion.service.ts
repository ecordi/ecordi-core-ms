import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { ChannelEventDto } from '../dtos/channel-event.dto';
import { Message, MessageDocument } from '../schemas/message.schema';
import { Thread, ThreadDocument } from '../schemas/thread.schema';
import { WebhookEvent, WebhookEventDocument } from '../schemas/webhook-event.schema';
import { ProcessAttachmentsService } from '../helpers/process-attachments';
import { MessagingService } from '../messaging.service';
import { MessagingWebSocketGateway } from '../../websocket/websocket.gateway';

export interface ProcessResult {
  messageId: string;
  processed: boolean;
  isNew: boolean;
}

@Injectable()
export class ChannelIngestionService {
  private readonly logger = new Logger(ChannelIngestionService.name);

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Thread.name) private readonly threadModel: Model<ThreadDocument>,
    @InjectModel(WebhookEvent.name) private readonly webhookEventModel: Model<WebhookEventDocument>,
    private readonly processAttachmentsService: ProcessAttachmentsService,
    private readonly messagingService: MessagingService,
    private readonly websocketGateway: MessagingWebSocketGateway,
  ) {}

  async processChannelEvent(eventDto: ChannelEventDto, idempotencyKey: string): Promise<ProcessResult> {
    // 1. Check idempotency - has this event been processed before?
    const existingEvent = await this.checkIdempotency(eventDto);
    if (existingEvent) {
      this.logger.debug(`Event already processed: ${eventDto.remoteId}`);
      return {
        messageId: existingEvent.id,
        processed: true,
        isNew: false
      };
    }

    // 2. Store webhook event for idempotency
    const webhookEvent = await this.storeWebhookEvent(eventDto);

    try {
      // 3. Publish to JetStream for async processing
      const messageId = await this.publishToJetStream(eventDto, idempotencyKey);

      // 4. Update webhook event status
      await this.updateWebhookEventStatus(webhookEvent._id, 'processed');

      return {
        messageId,
        processed: true,
        isNew: true
      };

    } catch (error) {
      // Update webhook event with error
      await this.updateWebhookEventStatus(webhookEvent._id, 'failed', error.message);
      throw error;
    }
  }

  private async checkIdempotency(eventDto: ChannelEventDto): Promise<WebhookEventDocument | null> {
    return this.webhookEventModel.findOne({
      channel: eventDto.channel,
      remoteId: eventDto.remoteId,
      companyId: eventDto.companyId,
      status: { $in: ['processed', 'pending'] }
    });
  }

  private async storeWebhookEvent(eventDto: ChannelEventDto): Promise<WebhookEventDocument> {
    const webhookEvent = new this.webhookEventModel({
      channel: eventDto.channel,
      remoteId: eventDto.remoteId,
      companyId: eventDto.companyId,
      receivedAt: new Date(),
      rawPayload: eventDto,
      status: 'pending'
    });

    return webhookEvent.save();
  }

  private async updateWebhookEventStatus(
    eventId: any, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    const update: any = { 
      status,
      processedAt: new Date()
    };

    if (errorMessage) {
      update.errorMessage = errorMessage;
      update.$inc = { retryCount: 1 };
    }

    await this.webhookEventModel.findByIdAndUpdate(eventId, update);
  }

  private async publishToJetStream(eventDto: ChannelEventDto, idempotencyKey: string): Promise<string> {
    // Calculate bucket based on connectionId for ordering
    const bucket = this.calculateBucket(eventDto.connectionId);
    
    const subject = `js.channel.${eventDto.channel}.message.${eventDto.direction}.${eventDto.companyId}.${bucket}.${eventDto.connectionId}`;
    
    const payload = {
      ...eventDto,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processedAt: new Date().toISOString()
    };

    try {
      // Publish with idempotency key as Nats-Msg-Id
      await this.messagingService.publishMessage(subject, payload);
      
      this.logger.debug(`Published to JetStream: ${subject} with idempotency key: ${idempotencyKey}`);
      
      return payload.messageId;

    } catch (error) {
      this.logger.error(`Failed to publish to JetStream: ${error.message}`);
      throw new Error(`JetStream publish failed: ${error.message}`);
    }
  }

  private calculateBucket(connectionId: string): string {
    // Simple hash-based bucket calculation for ordering
    const bucketCount = 10; // Configurable bucket count
    const hash = this.simpleHash(connectionId);
    return `bucket_${hash % bucketCount}`;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
