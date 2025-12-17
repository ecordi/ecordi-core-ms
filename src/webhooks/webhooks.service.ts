import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConnectionsService } from '../connections/connections.service';
import { OutboxService } from '../messaging/outbox/outbox.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly connectionsService: ConnectionsService,
    @Inject('NATS_SERVICE') private natsClient: ClientProxy,
    private readonly outbox: OutboxService,
  ) {}

  async verifyWebhook(hubMode: string, hubChallenge: string, hubVerifyToken: string, companyId?: string): Promise<string | null> {
    this.logger.log(`Webhook verification attempt - Mode: ${hubMode}, Company: ${companyId}`);

    if (hubMode !== 'subscribe') {
      this.logger.warn('Invalid hub mode for webhook verification');
      return null;
    }

    if (companyId) {
      // Verify token against company's connections
      const connections = await this.connectionsService.getConnectionsByCompany(companyId);
      const validConnection = connections.find(conn => conn.verifyToken === hubVerifyToken);
      
      if (!validConnection) {
        this.logger.warn(`Invalid verify token for company: ${companyId}`);
        return null;
      }
    }

    this.logger.log('Webhook verification successful');
    return hubChallenge;
  }

  async handleIncomingMessage(payload: any, companyId?: string): Promise<void> {
    this.logger.log(`Received incoming message for company: ${companyId}`);
    
    // Validate company has active WhatsApp connection
    if (companyId) {
      const connections = await this.connectionsService.getConnectionsByCompany(companyId);
      const activeConnection = connections.find(conn => conn.status === 'active' && conn.provider === 'whatsapp_cloud');
      
      if (!activeConnection) {
        this.logger.warn(`No active WhatsApp connection for company: ${companyId}`);
        return;
      }
    }

    // Enqueue to Outbox (JetStream publisher worker)
    try {
      const connectionId =
        payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ||
        payload?.metadata?.phone_number_id ||
        'unknown-connection';
      const remoteId =
        payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ||
        payload?.message?.id ||
        undefined;
      await this.outbox.enqueue({
        companyId: companyId || 'default-company',
        channel: 'whatsapp',
        connectionId,
        remoteId,
        kind: 'received',
        payload,
      });
    } catch (e) {
      this.logger.error(`Outbox enqueue (incoming) failed: ${e?.message || e}`);
    }

    // Forward to channel/bots via NATS (legacy compatibility)
    this.natsClient.emit('whatsapp.message.incoming', {
      companyId,
      payload,
      timestamp: new Date().toISOString()
    });
  }

  async handleMessageStatus(payload: any, companyId?: string): Promise<void> {
    this.logger.log(`Received message status update for company: ${companyId}`);

    // Enqueue to Outbox as status
    try {
      const connectionId =
        payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ||
        payload?.metadata?.phone_number_id ||
        payload?.connectionId ||
        'unknown-connection';
      const remoteId =
        payload?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id ||
        payload?.status?.id ||
        payload?.messageId ||
        undefined;
      await this.outbox.enqueue({
        companyId: companyId || 'default-company',
        channel: 'whatsapp',
        connectionId,
        remoteId,
        kind: 'status',
        payload,
      });
    } catch (e) {
      this.logger.error(`Outbox enqueue (status) failed: ${e?.message || e}`);
    }

    // Forward to channel/bots via NATS (legacy compatibility)
    this.natsClient.emit('whatsapp.message.status', {
      companyId,
      payload,
      timestamp: new Date().toISOString()
    });
  }

  async handleStatusUpdate(payload: any, companyId?: string): Promise<void> {
    this.logger.log(`Received status update for company: ${companyId}`);

    // Enqueue to Outbox as status (generic)
    try {
      const connectionId =
        payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ||
        payload?.metadata?.phone_number_id ||
        payload?.connectionId ||
        'unknown-connection';
      const remoteId =
        payload?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0]?.id ||
        payload?.status?.id ||
        payload?.messageId ||
        undefined;
      await this.outbox.enqueue({
        companyId: companyId || 'default-company',
        channel: 'whatsapp',
        connectionId,
        remoteId,
        kind: 'status',
        payload,
      });
    } catch (e) {
      this.logger.error(`Outbox enqueue (status generic) failed: ${e?.message || e}`);
    }

    // Forward to channel/bots via NATS (legacy compatibility)
    this.natsClient.emit('whatsapp.status.update', {
      companyId,
      payload,
      timestamp: new Date().toISOString()
    });
  }
}
