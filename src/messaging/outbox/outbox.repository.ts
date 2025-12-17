import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from '../schemas/outbox-event.schema';

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly model: Model<OutboxEventDocument>,
  ) {}

  async create(doc: Partial<OutboxEvent>): Promise<OutboxEventDocument> {
    return this.model.create(doc);
  }

  async findPendingBatch(limit: number, now: Date): Promise<OutboxEventDocument[]> {
    const query: FilterQuery<OutboxEventDocument> = { status: 'pending', nextAttemptAt: { $lte: now } } as any;
    return this.model.find(query).sort({ nextAttemptAt: 1 }).limit(limit).lean(false);
  }

  async markPublished(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { status: 'published' } });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { status: 'failed', error } });
  }

  async reschedule(id: string, retryCount: number, nextAttemptAt: Date, error?: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { retryCount, nextAttemptAt, ...(error ? { error } : {}) } });
  }
}
