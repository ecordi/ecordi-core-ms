import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JSONCodec, NatsConnection, JetStreamClient, JetStreamSubscription, DeliverPolicy, connect, headers, StringCodec } from 'nats';
import { MessagesService } from '../services/messages.service';
import { ThreadsService } from '../services/threads.service';
import { NatsInboundMessagePayload, NatsMessageStatusPayload, NatsThreadPayload } from '../interfaces/nats-contracts.interface';

@Injectable()
export class JetstreamConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JetstreamConsumerService.name);

  private nc?: NatsConnection;
  private js?: JetStreamClient;
  private subs: JetStreamSubscription[] = [];

  // Config
  private readonly channel = 'whatsapp';
  private readonly buckets = Number(process.env.JS_BUCKETS || 8);
  private readonly ackWaitNs = BigInt((Number(process.env.JS_ACK_WAIT_MS || 30000)) * 1_000_000);
  private readonly maxDeliver = Number(process.env.JS_MAX_DELIVER || 5);

  // Retry tracking for DLQ decision (per-instance)
  private retryCounter = new Map<string, number>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly threadsService: ThreadsService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureConnection();
      await this.startBucketedConsumers();
      this.logger.log('JetStream consumers started');
    } catch (err: any) {
      this.logger.error(`Failed to start JetStream consumer: ${err?.message}`, err?.stack);
    }
  }

  async onModuleDestroy() {
    try {
      for (const s of this.subs) {
        try { await s.drain(); } catch {}
      }
      if (this.nc) {
        await this.nc.drain();
        await this.nc.close();
      }
    } catch (err: any) {
      this.logger.error(`Error while shutting down JetStream consumer: ${err?.message}`);
    }
  }

  private async ensureConnection() {
    if (this.nc && this.js) return;
    const servers = (process.env.NATS_SERVERS || 'nats://localhost:4222').split(',');
    this.nc = await connect({ servers, reconnect: true, maxReconnectAttempts: -1, reconnectTimeWait: 2000 });
    this.js = this.nc.jetstream();
    this.logger.log(`Connected to NATS servers: ${servers.join(',')}`);
  }

  private async startBucketedConsumers() {
    if (!this.js) throw new Error('JetStream not initialized');
    const jc = JSONCodec<any>();

    for (let b = 0; b < this.buckets; b++) {
      const inboundSubject = `js.channel.${this.channel}.message.received.*.${b}.*`;
      const statusSubject = `js.channel.${this.channel}.message.status.*.${b}.*`;

      const inboundDurable = `core_${this.channel}_inbound_b${b}`;
      const statusDurable = `core_${this.channel}_status_b${b}`;

      const subIn = await this.js.subscribe(inboundSubject, {
        durable: inboundDurable,
        manualAck: true,
        ackWait: this.ackWaitNs,
        deliverPolicy: DeliverPolicy.All,
      });
      this.subs.push(subIn);

      (async () => {
        for await (const m of subIn) {
          try {
            const payload = jc.decode(m.data) as NatsInboundMessagePayload;
            const meta = this.parseSubject(m.subject);
            this.logger.debug(`JS inbound b=${b} ${meta.companyId}/${meta.connectionId} id=${payload.messageId || payload.externalMessageId}`);

            // Ensure thread exists if not provided
            if (!payload.threadId) {
              const threadPayload: NatsThreadPayload = {
                threadId: '',
                companyId: payload.companyId,
                type: 'dm',
                channelType: payload.channelType,
                connectionId: payload.connectionId,
                externalUserId: payload.fromId,
                metadata: payload.metadata,
              };
              const thread = await this.threadsService.findOrCreateThread(threadPayload);
              payload.threadId = thread.threadId;
            }

            await this.messagesService.upsertInboundMessage(payload);
            this.resetRetry(m);
            m.ack();
          } catch (err: any) {
            await this.handleFailureAndMaybeDLQ(m, 'received');
            this.logger.error(`Error processing JS inbound: ${err?.message}`, err?.stack);
          }
        }
      })();

      const subSt = await this.js.subscribe(statusSubject, {
        durable: statusDurable,
        manualAck: true,
        ackWait: this.ackWaitNs,
        deliverPolicy: DeliverPolicy.All,
      });
      this.subs.push(subSt);

      (async () => {
        for await (const m of subSt) {
          try {
            const payload = jc.decode(m.data) as NatsMessageStatusPayload;
            const meta = this.parseSubject(m.subject);
            this.logger.log(`📨 JS status received b=${b} ${meta.companyId}/${meta.connectionId} -> ${payload.status}`, {
              subject: m.subject,
              messageId: payload.messageId,
              externalMessageId: payload.externalMessageId,
              status: payload.status
            });
            await this.messagesService.updateMessageStatus(payload);
            this.logger.log(`✅ JS status processed successfully: ${payload.messageId} -> ${payload.status}`);
            this.resetRetry(m);
            m.ack();
          } catch (err: any) {
            this.logger.error(`❌ Error processing JS status: ${err?.message}`, {
              subject: m.subject,
              error: err?.stack,
              payload: jc.decode(m.data)
            });
            await this.handleFailureAndMaybeDLQ(m, 'status');
          }
        }
      })();
    }
  }

  private parseSubject(subject: string): { companyId: string; bucket: string; connectionId: string; kind: 'received' | 'status' } {
    const parts = subject.split('.');
    // js.channel.<channel>.message.<kind>.<companyId>.<bucket>.<connectionId>
    return {
      companyId: parts[5] || 'unknown',
      bucket: parts[6] || '0',
      connectionId: parts[7] || 'unknown',
      kind: (parts[4] as any) || 'received',
    } as any;
  }

  private getMsgId(m: any): string {
    try {
      const h = m.headers;
      const id = h?.get?.('Nats-Msg-Id');
      if (id) return id as string;
    } catch {}
    try {
      const jc = JSONCodec<any>();
      const p = jc.decode(m.data) as any;
      return p?.externalMessageId || p?.messageId || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private resetRetry(m: any) {
    const id = this.getMsgId(m);
    this.retryCounter.delete(id);
  }

  private async handleFailureAndMaybeDLQ(m: any, kind: 'received' | 'status') {
    const id = this.getMsgId(m);
    const count = (this.retryCounter.get(id) || 0) + 1;
    this.retryCounter.set(id, count);
    if (count >= this.maxDeliver) {
      // Publish to DLQ and terminate
      try {
        const meta = this.parseSubject(m.subject);
        const dlqSubj = `js.dlq.channel.${this.channel}.message.${kind}.${meta.companyId}.${meta.bucket}.${meta.connectionId}`;
        const sc = StringCodec();
        const h = headers();
        h.set('Nats-Msg-Id', id);
        await this.js!.publish(dlqSubj, m.data, { headers: h });
        this.logger.warn(`Republished to DLQ ${dlqSubj} after ${count} attempts`);
      } catch (e: any) {
        this.logger.error(`Failed to publish to DLQ: ${e?.message || e}`);
      } finally {
        this.retryCounter.delete(id);
        try { m.term(); } catch { try { m.ack(); } catch {} }
      }
    } else {
      try { m.nak(); } catch {}
    }
  }
}
