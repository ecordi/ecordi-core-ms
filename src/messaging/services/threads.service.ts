import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Thread, ThreadDocument, ThreadStatus } from '../schemas/thread.schema';
import { CreateThreadDto } from '../dto/create-thread.dto';
import { NatsThreadPayload } from '../interfaces/nats-contracts.interface';

@Injectable()
export class ThreadsService {
  private readonly logger = new Logger(ThreadsService.name);

  constructor(
    @InjectModel(Thread.name) private threadModel: Model<ThreadDocument>,
  ) {}

  /**
   * Find or create a thread based on channel and external user
   */
  async findOrCreateThread(payload: NatsThreadPayload): Promise<ThreadDocument> {
    const { companyId, channelType, connectionId, externalUserId, type } = payload;

    // Try to find existing active thread
    let thread = await this.threadModel.findOne({
      companyId,
      channelType,
      connectionId,
      externalUserId,
      type,
      status: ThreadStatus.ACTIVE,
    }).exec();

    if (!thread) {
      // Create new thread
      const threadId = uuidv4();
      thread = new this.threadModel({
        threadId,
        companyId,
        type,
        channelType,
        connectionId,
        externalUserId,
        status: ThreadStatus.ACTIVE,
        subject: payload.subject,
        feedPostId: payload.feedPostId,
        parentCommentId: payload.parentCommentId,
        metadata: payload.metadata,
        lastMessageAt: new Date(),
      });

      await thread.save();
      this.logger.log(`Created new thread: ${threadId} for ${externalUserId}`);
    }

    return thread;
  }

  /**
   * Create a new thread manually
   */
  async createThread(createThreadDto: CreateThreadDto): Promise<ThreadDocument> {
    const threadId = uuidv4();
    
    const thread = new this.threadModel({
      threadId,
      ...createThreadDto,
      status: ThreadStatus.ACTIVE,
      lastMessageAt: new Date(),
    });

    await thread.save();
    this.logger.log(`Created thread: ${threadId}`);
    return thread;
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<ThreadDocument> {
    const thread = await this.threadModel.findOne({ threadId }).exec();
    if (!thread) {
      throw new NotFoundException(`Thread ${threadId} not found`);
    }
    return thread;
  }

  /**
   * List threads for a company with pagination
   */
  async listThreads(
    companyId: string,
    options: {
      status?: ThreadStatus;
      channelType?: string;
      connectionId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<{ threads: ThreadDocument[]; total: number; page: number; limit: number }> {
    const {
      status,
      channelType,
      connectionId,
      page = 1,
      limit = 20,
      sortBy = 'lastMessageAt',
      sortOrder = 'desc',
    } = options;

    const filter: any = { companyId };
    if (status) filter.status = status;
    if (channelType) filter.channelType = channelType;
    if (connectionId) filter.connectionId = connectionId;

    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [threads, total] = await Promise.all([
      this.threadModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.threadModel.countDocuments(filter).exec(),
    ]);

    return { threads, total, page, limit };
  }

  /**
   * Update thread's last message timestamp
   */
  async updateLastMessageAt(threadId: string, timestamp: Date = new Date()): Promise<void> {
    await this.threadModel.updateOne(
      { threadId },
      { lastMessageAt: timestamp },
    ).exec();
  }

  /**
   * Close a thread
   */
  async closeThread(threadId: string, internalUserId?: string): Promise<ThreadDocument> {
    const thread = await this.getThread(threadId);
    
    thread.status = ThreadStatus.CLOSED;
    thread.closedAt = new Date();
    if (internalUserId) {
      thread.internalUserId = internalUserId;
    }

    await thread.save();
    this.logger.log(`Closed thread: ${threadId}`);
    return thread;
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string): Promise<ThreadDocument> {
    const thread = await this.getThread(threadId);
    
    thread.status = ThreadStatus.ARCHIVED;
    thread.archivedAt = new Date();

    await thread.save();
    this.logger.log(`Archived thread: ${threadId}`);
    return thread;
  }

  /**
   * Assign thread to internal user
   */
  async assignThread(threadId: string, internalUserId: string): Promise<ThreadDocument> {
    const thread = await this.getThread(threadId);
    thread.internalUserId = internalUserId;
    await thread.save();
    
    this.logger.log(`Assigned thread ${threadId} to user ${internalUserId}`);
    return thread;
  }

  /**
   * Add tags to thread
   */
  async addTags(threadId: string, tags: string[]): Promise<ThreadDocument> {
    const thread = await this.getThread(threadId);
    const currentTags = thread.tags || [];
    const newTags = [...new Set([...currentTags, ...tags])];
    
    thread.tags = newTags;
    await thread.save();
    
    this.logger.log(`Added tags to thread ${threadId}: ${tags.join(', ')}`);
    return thread;
  }

  /**
   * Remove tags from thread
   */
  async removeTags(threadId: string, tags: string[]): Promise<ThreadDocument> {
    const thread = await this.getThread(threadId);
    const currentTags = thread.tags || [];
    const updatedTags = currentTags.filter(tag => !tags.includes(tag));
    
    thread.tags = updatedTags;
    await thread.save();
    
    this.logger.log(`Removed tags from thread ${threadId}: ${tags.join(', ')}`);
    return thread;
  }
}
