import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Thread, ThreadDocument } from '../schemas/thread.schema';
import { Message, MessageDocument } from '../schemas/message.schema';

export interface CreateThreadDto {
  companyId: string;
  channel: string;
  connectionId: string;
  remoteThreadId: string;
  contactId: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  taskId?: string;
  type?: 'dm' | 'task' | 'group';
  metadata?: Record<string, any>;
}

export interface ThreadWithMessages {
  thread: ThreadDocument;
  messages: MessageDocument[];
  totalMessages: number;
}

@Injectable()
export class ThreadService {
  constructor(
    @InjectModel(Thread.name) private threadModel: Model<ThreadDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Find or create thread by taskId
   */
  async findOrCreateByTaskId(
    companyId: string,
    taskId: string,
    threadData: Partial<CreateThreadDto>
  ): Promise<ThreadDocument> {
    // Try to find existing thread by taskId
    let thread = await this.threadModel.findOne({
      companyId,
      taskId,
      status: { $ne: 'closed' }
    });

    if (!thread) {
      // Create new thread for this task
      thread = new this.threadModel({
        ...threadData,
        companyId,
        taskId,
        type: 'task',
        status: 'active',
        messageCount: 0,
      });
      await thread.save();
    }

    return thread;
  }

  /**
   * Find or create thread by remote thread ID (for DMs)
   */
  async findOrCreateByRemoteId(
    companyId: string,
    remoteThreadId: string,
    connectionId: string,
    threadData: Partial<CreateThreadDto>
  ): Promise<ThreadDocument> {
    let thread = await this.threadModel.findOne({
      companyId,
      remoteThreadId,
      connectionId,
      status: { $ne: 'closed' }
    });

    if (!thread) {
      thread = new this.threadModel({
        ...threadData,
        companyId,
        remoteThreadId,
        connectionId,
        type: 'dm',
        status: 'active',
        messageCount: 0,
      });
      await thread.save();
    }

    return thread;
  }

  /**
   * Get thread with messages by taskId
   */
  async getThreadByTaskId(
    companyId: string,
    taskId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ThreadWithMessages | null> {
    const thread = await this.threadModel.findOne({
      companyId,
      taskId,
      status: { $ne: 'closed' }
    });

    if (!thread) {
      return null;
    }

    const skip = (page - 1) * limit;
    const messages = await this.messageModel
      .find({ threadId: thread._id })
      .sort({ sequenceNumber: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalMessages = await this.messageModel.countDocuments({
      threadId: thread._id
    });

    return {
      thread,
      messages,
      totalMessages
    };
  }

  /**
   * Get all threads for a company with pagination
   */
  async getThreadsByCompany(
    companyId: string,
    page: number = 1,
    limit: number = 20,
    status: string = 'active',
    options?: {
      channel?: string;
      type?: 'dm' | 'task' | 'group';
      connectionId?: string;
      contactId?: string;
      from?: Date | string;
      to?: Date | string;
      q?: string; // free-text search on contactName/lastMessageText/contactPhone/contactEmail
    }
  ): Promise<{ threads: ThreadDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const query: any = { companyId };
    if (status) query.status = status;
    if (options?.channel) query.channel = options.channel;
    if (options?.type) query.type = options.type;
    if (options?.connectionId) query.connectionId = options.connectionId;
    if (options?.contactId) query.contactId = options.contactId;

    if (options?.from || options?.to) {
      query.lastMessageAt = {} as any;
      if (options.from) query.lastMessageAt.$gte = new Date(options.from);
      if (options.to) query.lastMessageAt.$lte = new Date(options.to);
    }

    // Build MongoDB find with optional text search
    const find = this.threadModel.find(query);
    if (options?.q) {
      // text search uses the defined text index on the collection
      find.where({ $text: { $search: options.q } });
    }

    const threads = await find
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    // Count uses same filter (note: Mongo can't combine $text easily in countDocuments via same builder)
    const countFilter: any = { ...query };
    const total = await this.threadModel.countDocuments(
      options?.q ? { ...countFilter, $text: { $search: options.q } } : countFilter
    );

    return { threads, total };
  }

  /**
   * Update thread when new message is added
   */
  async updateThreadOnNewMessage(
    threadId: Types.ObjectId,
    messageText?: string
  ): Promise<void> {
    await this.threadModel.updateOne(
      { _id: threadId },
      {
        $inc: { messageCount: 1 },
        $set: {
          lastMessageAt: new Date(),
          lastMessageText: messageText?.substring(0, 100) || 'Media message'
        }
      }
    );
  }

  /**
   * Archive thread
   */
  async archiveThread(companyId: string, threadId: string): Promise<boolean> {
    const result = await this.threadModel.updateOne(
      { _id: threadId, companyId },
      { status: 'archived' }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Close thread
   */
  async closeThread(companyId: string, threadId: string): Promise<boolean> {
    const result = await this.threadModel.updateOne(
      { _id: threadId, companyId },
      { status: 'closed' }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get thread statistics
   */
  async getThreadStats(companyId: string): Promise<{
    active: number;
    archived: number;
    closed: number;
    totalMessages: number;
  }> {
    const [stats, messageCount] = await Promise.all([
      this.threadModel.aggregate([
        { $match: { companyId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      this.messageModel.countDocuments({ companyId })
    ]);

    const result = {
      active: 0,
      archived: 0,
      closed: 0,
      totalMessages: messageCount
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
    });

    return result;
  }
}
