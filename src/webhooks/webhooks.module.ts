import { Module } from '@nestjs/common';
import { WebhooksController, ChannelWebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ConnectionsModule } from '../connections/connections.module';
import { NatsModule } from '../transports/nats.module';

@Module({
  imports: [ConnectionsModule, NatsModule],
  controllers: [WebhooksController, ChannelWebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService]
})
export class WebhooksModule {}
