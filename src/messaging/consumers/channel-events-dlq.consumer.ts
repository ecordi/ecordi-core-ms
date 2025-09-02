import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { connect, NatsConnection, Msg } from 'nats';
import { WebhookEvent, WebhookEventDocument } from '../schemas/webhook-event.schema';

@Injectable()
export class ChannelEventsDLQConsumer implements OnModuleInit {
  private readonly logger = new Logger(ChannelEventsDLQConsumer.name);
  private natsConnection: NatsConnection;

  constructor(
    @InjectModel(WebhookEvent.name) private webhookEventModel: Model<WebhookEventDocument>,
  ) {}

  async onModuleInit() {
    // Delay connection to allow JetStream streams to be created first
    setTimeout(async () => {
      await this.connectAndSubscribe();
    }, 6000);
  }

  private async connectAndSubscribe() {
    try {
      this.natsConnection = await connect({
        servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
      });

      // Remove unused jetstream reference
      
      // Simple NATS subscription for DLQ
      const sub = this.natsConnection.subscribe('channels.*.events.*.dlq');
      
      // Process DLQ messages
      (async () => {
        for await (const msg of sub) {
          await this.handleDLQEvent(msg);
        }
      })();
      
      this.logger.log('NATS DLQ consumer started for failed channel events');

    } catch (error) {
      this.logger.error('Failed to connect to NATS JetStream DLQ:', error);
    }
  }


  async handleDLQEvent(msg: Msg) {
    try {
      const eventData = JSON.parse(new TextDecoder().decode(msg.data));
      
      this.logger.error(`📥 DLQ Event received for failed processing:`, {
        subject: msg.subject,
        eventId: eventData.remoteId,
        companyId: eventData.companyId,
        channel: eventData.channel,
        deliveryCount: 'unknown',
        timestamp: new Date().toISOString()
      });

      // Update webhook event status to failed
      if (eventData.remoteId) {
        await this.webhookEventModel.updateOne(
          { 
            remoteId: eventData.remoteId,
            companyId: eventData.companyId,
            channel: eventData.channel 
          },
          { 
            status: 'failed',
            errorMessage: `Message moved to DLQ after unknown delivery attempts`,
            processedAt: new Date()
          }
        );
      }

      // TODO: Implement alerting/monitoring for DLQ events
      // - Send to monitoring system (Prometheus, DataDog, etc.)
      // - Send alert to Slack/email
      // - Create incident ticket
      
      // msg.ack(); // Not available in simple NATS
      
    } catch (error) {
      this.logger.error(`Failed to process DLQ event: ${error.message}`, error.stack);
      // msg.nak(); // Not available in simple NATS
    }
  }

  async close(): Promise<void> {
    if (this.natsConnection) {
      await this.natsConnection.close();
      this.logger.log('DLQ consumer connection closed');
    }
  }
}
