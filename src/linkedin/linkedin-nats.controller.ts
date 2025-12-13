import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LinkedInService } from './linkedin.service';
import { LinkedInEventsService } from './linkedin-events.service';
import { LinkedInConnectionsService } from './linkedin-connections.service';

@Controller()
export class LinkedInNatsController {
  private readonly logger = new Logger(LinkedInNatsController.name);

  constructor(
    private readonly linkedInService: LinkedInService,
    private readonly linkedInEventsService: LinkedInEventsService,
    private readonly linkedInConnectionsService: LinkedInConnectionsService,
  ) {}

  /**
   * Handles outbound LinkedIn post requests from Core-MS to LinkedIn Channel MS
   * Pattern: linkedin.post.outbound
   */
  @MessagePattern('linkedin.post.outbound')
  async handleOutboundPost(@Payload() data: any) {
    try {
      this.logger.log(`📤 NATS: Received outbound LinkedIn post request: ${JSON.stringify(data)}`);

      const result = await this.linkedInService.createPost(data);
      
      this.logger.log(`✅ NATS: LinkedIn post created successfully: ${result.postId}`);
      return { success: true, post: result };
    } catch (error) {
      this.logger.error(`❌ NATS: Error creating LinkedIn post: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handles LinkedIn webhook events from LinkedIn Channel MS
   * Pattern: linkedin.webhook.inbound
   */
  @MessagePattern('linkedin.webhook.inbound')
  async handleWebhookEvent(@Payload() data: any) {
    try {
      this.logger.log(`📥 NATS: Received LinkedIn webhook event: ${data.type}`);

      const result = await this.linkedInEventsService.processWebhookEvent(data);
      
      this.logger.log(`✅ NATS: LinkedIn webhook processed: ${result.eventId}`);
      return { success: true, eventId: result.eventId };
    } catch (error) {
      this.logger.error(`❌ NATS: Error processing LinkedIn webhook: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handles LinkedIn connection status updates from LinkedIn Channel MS
   * Pattern: linkedin.connection.status
   */
  @MessagePattern('linkedin.connection.status')
  async handleConnectionStatus(@Payload() data: any) {
    try {
      this.logger.log(`🔗 NATS: Received LinkedIn connection status update: ${JSON.stringify(data)}`);

      const { connectionId, status, error } = data;
      
      const updateData: any = { status };
      if (error) {
        updateData.errorMessage = error;
      }

      const result = await this.linkedInConnectionsService.updateConnection(connectionId, updateData);
      
      this.logger.log(`✅ NATS: LinkedIn connection status updated: ${connectionId} -> ${status}`);
      return { success: true, connection: result };
    } catch (error) {
      this.logger.error(`❌ NATS: Error updating LinkedIn connection status: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handles LinkedIn post status updates from LinkedIn Channel MS
   * Pattern: linkedin.post.status
   */
  @MessagePattern('linkedin.post.status')
  async handlePostStatus(@Payload() data: any) {
    try {
      this.logger.log(`📝 NATS: Received LinkedIn post status update: ${JSON.stringify(data)}`);

      const { postId, status, linkedInResponse, errorMessage } = data;
      
      const result = await this.linkedInService.updatePostStatus(postId, status, linkedInResponse, errorMessage);
      
      this.logger.log(`✅ NATS: LinkedIn post status updated: ${postId} -> ${status}`);
      return { success: true, post: result };
    } catch (error) {
      this.logger.error(`❌ NATS: Error updating LinkedIn post status: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handles LinkedIn connection creation requests
   * Pattern: linkedin.connection.create
   */
  @MessagePattern('linkedin.connection.create')
  async handleCreateConnection(@Payload() data: any) {
    try {
      this.logger.log(`🔗 NATS: Received LinkedIn connection creation request: ${JSON.stringify(data)}`);

      const result = await this.linkedInConnectionsService.createConnection(data);
      
      this.logger.log(`✅ NATS: LinkedIn connection created: ${result.connectionId}`);
      return { success: true, connection: result };
    } catch (error) {
      this.logger.error(`❌ NATS: Error creating LinkedIn connection: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handles LinkedIn token refresh requests
   * Pattern: linkedin.token.refresh
   */
  @MessagePattern('linkedin.token.refresh')
  async handleTokenRefresh(@Payload() data: any) {
    try {
      this.logger.log(`🔄 NATS: Received LinkedIn token refresh request: ${data.connectionId}`);

      const result = await this.linkedInConnectionsService.refreshToken(data.connectionId);
      
      this.logger.log(`✅ NATS: LinkedIn token refreshed: ${data.connectionId}`);
      return { success: true, connection: result };
    } catch (error) {
      this.logger.error(`❌ NATS: Error refreshing LinkedIn token: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
