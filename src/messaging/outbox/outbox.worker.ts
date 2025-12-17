import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer?: NodeJS.Timeout;
  private readonly intervalMs = Number(process.env.OUTBOX_INTERVAL_MS || 2000);

  constructor(private readonly outbox: OutboxService) {}

  async onModuleInit() {
    // Stagger first run a bit, then interval
    this.timer = setInterval(() => {
      this.outbox
        .processBatchOnce()
        .catch((e) => this.logger.error(`Outbox tick error: ${e?.message || e}`));
    }, this.intervalMs);
    this.logger.log(`Outbox worker started (interval ${this.intervalMs}ms)`);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
