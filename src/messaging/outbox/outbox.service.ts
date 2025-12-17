import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JetStreamClient, NatsConnection, StringCodec, connect, headers, nanos } from 'nats';
import { OutboxRepository } from './outbox.repository';
import { OutboxEventDocument } from '../schemas/outbox-event.schema';

function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}
function bucketOf(connectionId: string, buckets: number): number {
  const h = fnv1a32(connectionId || '');
  return h % Math.max(1, buckets);
}

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private nc?: NatsConnection;
  private js?: JetStreamClient;

  private readonly buckets = Number(process.env.JS_BUCKETS || 8);
  private readonly batch = Number(process.env.OUTBOX_BATCH || 100);
  private readonly maxRetries = Number(process.env.OUTBOX_MAX_RETRIES || 8);
  private readonly baseDelay = Number(process.env.OUTBOX_BASE_DELAY_MS || 1000);
  private readonly backoff = Number(process.env.OUTBOX_BACKOFF_FACTOR || 4);

  constructor(private readonly repo: OutboxRepository) {}

  async onModuleInit() {
    await this.ensureConnection();
  }

  async onModuleDestroy() {
    try { if (this.nc) await this.nc.drain(); } catch {}
  }

  private async ensureConnection() {
    if (this.nc && this.js) return;
    const servers = (process.env.NATS_SERVERS || 'nats://localhost:4222').split(',');
    this.nc = await connect({ servers, reconnect: true, maxReconnectAttempts: -1, reconnectTimeWait: 2000, name: process.env.NATS_CLIENT_NAME || 'core-outbox-pub' });
    this.js = this.nc.jetstream();
  }

  async enqueue(event: {
    companyId: string;
    channel: string;
    connectionId: string;
    remoteId?: string;
    kind: 'received' | 'status' | 'generic';
    payload: any;
    headers?: Record<string, string>;
    subjectOverride?: string;
  }): Promise<OutboxEventDocument> {
    const doc = await this.repo.create({
      ...event,
      status: 'pending',
      retryCount: 0,
      nextAttemptAt: new Date(),
    } as any);
    return doc;
  }

  private buildSubject(e: OutboxEventDocument): string {
    if (e.subjectOverride) return e.subjectOverride;
    const bucket = bucketOf(e.connectionId, this.buckets);
    // js.channel.<channel>.message.<kind>.<companyId>.<bucket>.<connectionId>
    return `js.channel.${e.channel}.message.${e.kind}.${e.companyId}.${bucket}.${e.connectionId}`;
  }

  private buildMsgId(e: OutboxEventDocument): string | undefined {
    if (!e.remoteId) return undefined;
    return `${e.companyId}:${e.connectionId}:${e.remoteId}`;
  }

  private nextBackoff(retryCount: number): number {
    // exponential backoff: base * factor^retry, capped to 30 minutes
    const ms = this.baseDelay * Math.pow(this.backoff, retryCount);
    return Math.min(ms, 30 * 60 * 1000);
  }

  async processBatchOnce(now: Date = new Date()): Promise<void> {
    await this.ensureConnection();
    const items = await this.repo.findPendingBatch(this.batch, now);
    if (!items.length) return;

    const sc = StringCodec();
    for (const e of items) {
      try {
        const subject = this.buildSubject(e);
        const h = headers();
        const msgId = this.buildMsgId(e);
        if (msgId) h.set('Nats-Msg-Id', msgId);
        if (e.headers) {
          for (const [k, v] of Object.entries(e.headers)) h.set(k, String(v));
        }
        await this.js!.publish(subject, sc.encode(JSON.stringify(e.payload)), { headers: h });
        await this.repo.markPublished(e._id.toString());
      } catch (err: any) {
        const rc = (e.retryCount || 0) + 1;
        if (rc >= this.maxRetries) {
          await this.repo.markFailed(e._id.toString(), err?.message || String(err));
          this.logger.error(`Outbox permanently failed id=${e._id} err=${err?.message || err}`);
        } else {
          const delay = this.nextBackoff(rc);
          const next = new Date(Date.now() + delay);
          await this.repo.reschedule(e._id.toString(), rc, next, err?.message || String(err));
          this.logger.warn(`Outbox retry in ${delay}ms id=${e._id}`);
        }
      }
    }
  }
}
