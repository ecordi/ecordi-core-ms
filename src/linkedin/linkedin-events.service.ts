import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LinkedInEvent, LinkedInEventDocument } from './schemas/linkedin-event.schema';
import { LinkedInWebhookEventDto } from './dto/linkedin-webhook-event.dto';
import { LinkedInConnectionsService } from './linkedin-connections.service';
import axios from 'axios';

@Injectable()
export class LinkedInEventsService {
  private readonly logger = new Logger(LinkedInEventsService.name);

  constructor(
    @InjectModel(LinkedInEvent.name)
    private linkedInEventModel: Model<LinkedInEventDocument>,
    private linkedInConnectionsService: LinkedInConnectionsService,
  ) {}

  async processWebhookEvent(eventDto: LinkedInWebhookEventDto): Promise<LinkedInEvent> {
    try {
      this.logger.log(`📥 Processing LinkedIn webhook event: ${eventDto.type}`);

      // Get connection details
      const connection = await this.linkedInConnectionsService.findOne(eventDto.connectionId);

      // Create event record
      const event = new this.linkedInEventModel({
        eventId: this.generateEventId(eventDto),
        connectionId: eventDto.connectionId,
        companyId: eventDto.companyId,
        type: eventDto.type,
        event: eventDto,
        processed: false,
        delivered: false,
        receivedAt: new Date(),
      });

      const savedEvent = await event.save();

      // Process the event based on type
      await this.processEventByType(savedEvent, connection);

      // Send to configured webhooks
      await this.sendToWebhooks(savedEvent, connection);

      // Mark as processed
      await this.markEventAsProcessed(savedEvent._id.toString());

      this.logger.log(`✅ LinkedIn event processed successfully: ${savedEvent.eventId}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`❌ Error processing LinkedIn webhook event: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findEventsByConnection(connectionId: string, limit = 50): Promise<LinkedInEvent[]> {
    return this.linkedInEventModel
      .find({ connectionId })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .exec();
  }

  async findEventsByCompany(companyId: string, limit = 50): Promise<LinkedInEvent[]> {
    return this.linkedInEventModel
      .find({ companyId })
      .sort({ receivedAt: -1 })
      .limit(limit)
      .exec();
  }

  private async processEventByType(event: LinkedInEvent, connection: any): Promise<void> {
    switch (event.type) {
      case 'ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS':
        await this.processOrganizationSocialAction(event, connection);
        break;
      default:
        this.logger.warn(`🤷 Unknown LinkedIn event type: ${event.type}`);
    }
  }

  private async processOrganizationSocialAction(event: LinkedInEvent, connection: any): Promise<void> {
    try {
      const notifications = event.event.notifications || [];
      
      for (const notification of notifications) {
        // Validate if the event owner is the same as the connection
        if (this.validateSocialOwner(notification, connection)) {
          this.logger.log(`📱 Processing social action for connection: ${connection.connectionId}`);
          
          // Transform LinkedIn notification to internal format
          const transformedEvent = this.transformLinkedInNotification(notification, event);
          
          // Here you can add logic to save to messaging system, create tasks, etc.
          // For now, we'll just log the processed event
          this.logger.log(`🔄 Transformed LinkedIn event: ${JSON.stringify(transformedEvent)}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error processing organization social action: ${error.message}`);
      throw error;
    }
  }

  private async sendToWebhooks(event: LinkedInEvent, connection: any): Promise<void> {
    const webhookResponses = [];

    for (const webhook of connection.webhooks || []) {
      try {
        if (webhook.type === 'HTTP_REQUEST') {
          const response = await this.sendHttpWebhook(webhook, event);
          webhookResponses.push({
            webhookType: webhook.type,
            status: 'success',
            response: response.data,
            sentAt: new Date(),
          });
        }
      } catch (error) {
        webhookResponses.push({
          webhookType: webhook.type,
          status: 'error',
          response: { error: error.message },
          sentAt: new Date(),
        });
        this.logger.error(`❌ Error sending webhook: ${error.message}`);
      }
    }

    // Update event with webhook responses
    await this.linkedInEventModel.updateOne(
      { _id: (event as any)._id },
      { 
        webhookResponses,
        delivered: webhookResponses.some(r => r.status === 'success')
      }
    );
  }

  private async sendHttpWebhook(webhook: any, event: LinkedInEvent): Promise<any> {
    const url = webhook.action;
    const headers = {
      'Content-Type': 'application/json',
      ...webhook.params?.headers,
    };

    return axios.post(url, {
      eventId: event.eventId,
      type: event.type,
      connectionId: event.connectionId,
      companyId: event.companyId,
      data: event.event,
      receivedAt: event.receivedAt,
    }, { headers });
  }

  private async markEventAsProcessed(eventId: string): Promise<void> {
    await this.linkedInEventModel.updateOne(
      { _id: eventId },
      { 
        processed: true,
        processedAt: new Date()
      }
    );
  }

  private validateSocialOwner(notification: any, connection: any): boolean {
    // Check if the notification belongs to the connected organization
    const actorUrn = notification.actor;
    const organizationUrn = `urn:li:organization:${connection.connectionId}`;
    
    return actorUrn === organizationUrn;
  }

  private transformLinkedInNotification(notification: any, event: LinkedInEvent): any {
    return {
      id: this.generateEventId({ notifications: [notification] }),
      type: 'linkedin_social_action',
      source: 'linkedin',
      connectionId: event.connectionId,
      companyId: event.companyId,
      data: {
        actor: notification.actor,
        object: notification.object,
        verb: notification.verb,
        target: notification.target,
        time: notification.time,
      },
      originalEvent: notification,
      processedAt: new Date(),
    };
  }

  private generateEventId(eventData: any): string {
    const timestamp = Date.now();
    const hash = Buffer.from(JSON.stringify(eventData)).toString('base64').slice(0, 8);
    return `linkedin_${timestamp}_${hash}`;
  }
}
