import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, NatsConnection, JetStreamClient, StringCodec } from 'nats';
import { subjectFor, Channel } from './subject.helper';

@Injectable()
export class PublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublisherService.name);
  private nc!: NatsConnection;
  private js!: JetStreamClient;
  private sc = StringCodec();

  async onModuleInit() {
    const servers = process.env.NATS_SERVERS || process.env.NATS_URL || 'nats://localhost:4222';
    this.nc = await connect({ servers: servers.split(',') });
    this.js = this.nc.jetstream();
    this.logger.log(`Connected to NATS: ${servers}`);
  }

  async onModuleDestroy() {
    try {
      await this.nc?.drain();
    } catch {}
  }

  async publishMessageReceived(evt: {
    companyId: string;
    channel: Channel;
    remoteId: string;
    payload: any;
    version?: number;
  }) {
    const subject = subjectFor.received(evt.companyId, evt.channel);
    const msgID = `${evt.companyId}:${evt.channel}:${evt.remoteId}`;
    const envelope = {
      event: 'MessageReceived',
      version: evt.version ?? 1,
      companyId: evt.companyId,
      channel: evt.channel,
      payload: evt.payload,
    };
    await this.js.publish(subject, this.sc.encode(JSON.stringify(envelope)), { msgID });
  }

  async publishOutbound(evt: {
    companyId: string;
    channel: Channel;
    key: string; // dedupe key
    payload: any;
    version?: number;
  }) {
    const subject = subjectFor.outbound(evt.companyId, evt.channel);
    await this.js.publish(
      subject,
      this.sc.encode(
        JSON.stringify({ event: 'MessageOutbound', version: evt.version ?? 1, companyId: evt.companyId, channel: evt.channel, payload: evt.payload })
      ),
      { msgID: evt.key }
    );
  }
}
