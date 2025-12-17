import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageDocument } from '../schemas/message.schema';
import { TasksService } from '../../tasks/services/tasks.service';

@Injectable()
export class MessageStoreService {
  private readonly logger = new Logger(MessageStoreService.name);

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    private readonly tasksService: TasksService,
  ) {}

  async findOrCreateTaskForConversation(params: {
    companyId: string;
    channelType: string;
    connectionId: string;
    customerId: string;
  }) {
    return this.tasksService.findOrCreateForConversation(params);
  }

  async saveInboundIdempotent(params: {
    taskId: Types.ObjectId;
    companyId: string;
    channelType: string;
    connectionId: string;
    type: string;
    fromId: string;
    toId: string;
    body?: string;
    remoteId: string;
    kbFiles?: Array<{
      fileId: string;
      url: string;
      name?: string;
      mimeType?: string;
      size?: number;
      caption?: string;
      sha256?: string;
    }>;
    providerTimestamp?: Date;
    raw?: any;
  }): Promise<{ messageId: string; _id: Types.ObjectId }> {
    const messageId = uuidv4();
    
    // Try upsert by remoteId for idempotency
    const filter = { connectionId: params.connectionId, remoteId: params.remoteId };
    const update = {
      $setOnInsert: {
        taskId: params.taskId,
        companyId: params.companyId,
        channelType: params.channelType,
        connectionId: params.connectionId,
        direction: 'inbound',
        messageId,
        type: params.type,
        fromId: params.fromId,
        toId: params.toId,
        body: params.body,
        kbFiles: params.kbFiles || [],
        status: 'received',
        providerTimestamp: params.providerTimestamp,
        raw: params.raw,
        isInternal: false,
        createdAt: new Date(),
      },
      $set: {
        updatedAt: new Date(),
      },
    };

    const result = await this.messageModel.updateOne(filter, update, { upsert: true }).exec();
    
    // Find the document to return
    const doc = await this.messageModel.findOne(filter).exec();
    return { messageId: doc.messageId, _id: doc._id };
  }

  async saveInternalNote(params: {
    taskId: Types.ObjectId;
    companyId: string;
    channelType: string;
    connectionId: string;
    body: string;
    kbFiles?: Array<{
      fileId: string;
      url: string;
      name?: string;
      mimeType?: string;
      size?: number;
      caption?: string;
      sha256?: string;
    }>;
    userId: string;
  }): Promise<{ messageId: string; _id: Types.ObjectId }> {
    const messageId = uuidv4();
    
    const message = new this.messageModel({
      messageId,
      taskId: params.taskId,
      companyId: params.companyId,
      channelType: params.channelType,
      connectionId: params.connectionId,
      direction: 'internal',
      isInternal: true,
      type: 'text',
      body: params.body,
      fromId: params.userId || 'system',
      toId: 'internal',
      kbFiles: params.kbFiles || [],
      status: 'sent',
    });

    await message.save();
    this.logger.log(`Saved internal note: ${messageId}`);
    
    return { messageId, _id: message._id };
  }

  async saveOutboundQueued(params: {
    taskId: Types.ObjectId;
    companyId: string;
    channelType: string;
    connectionId: string;
    type: string;
    fromId: string;
    toId: string;
    body: string;
    kbFiles?: Array<{
      fileId: string;
      url: string;
      name?: string;
      mimeType?: string;
      size?: number;
      caption?: string;
      sha256?: string;
    }>;
  }): Promise<{ messageId: string; _id: Types.ObjectId }> {
    const messageId = uuidv4();
    
    const doc = await this.messageModel.create({
      taskId: params.taskId,
      companyId: params.companyId,
      channelType: params.channelType,
      connectionId: params.connectionId,
      direction: 'outbound',
      messageId,
      type: params.type,
      fromId: params.fromId,
      toId: params.toId,
      body: params.body,
      kbFiles: params.kbFiles || [],
      status: 'queued',
      isInternal: false,
    });

    return { messageId: doc.messageId, _id: doc._id };
  }

  /**
   * Update message with remoteId after successful send to Channel-MS
   */
  async updateMessageRemoteId(messageId: string, remoteId: string, status: string = 'sent'): Promise<void> {
    const message = await this.messageModel.findOne({ messageId }).exec();
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    message.remoteId = remoteId;
    message.status = status as any;
    await message.save();
    
    this.logger.log(`Updated message ${messageId} with remoteId: ${remoteId} and status: ${status}`);
  }

  async listByTask(params: {
    taskId: string;
    includeInternal: boolean;
  }): Promise<MessageDocument[]> {
    const filter: any = { taskId: new Types.ObjectId(params.taskId) };
    
    if (!params.includeInternal) {
      filter.isInternal = { $ne: true };
    }

    return this.messageModel.find(filter).sort({ createdAt: 1 }).exec();
  }

  async listCompanyMessages(params: {
    companyId: string;
    page?: number;
    limit?: number;
    taskId?: string;
    direction?: 'inbound' | 'outbound' | 'internal';
    type?: string;
    status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
    from?: Date | string;
    to?: Date | string;
    q?: string; // search in body/fromId/toId
    sort?: 'asc' | 'desc';
    includeInternal?: boolean;
  }): Promise<{ items: MessageDocument[]; total: number; page: number; limit: number } > {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const filter: any = { companyId: params.companyId };
    if (params.taskId) filter.taskId = new Types.ObjectId(params.taskId);
    if (params.direction) filter.direction = params.direction;
    if (params.type) filter.type = params.type;
    if (params.status) filter.status = params.status;
    if (params.from || params.to) {
      filter.createdAt = {} as any;
      if (params.from) filter.createdAt.$gte = new Date(params.from);
      if (params.to) filter.createdAt.$lte = new Date(params.to);
    }
    if (params.includeInternal === false) {
      filter.isInternal = { $ne: true };
    }

    const find = this.messageModel.find(filter);
    if (params.q) {
      // Basic regex search. For performance, consider adding a text index later.
      const regex = new RegExp(params.q, 'i');
      find.where({ $or: [{ body: regex }, { fromId: regex }, { toId: regex }] });
    }

    const items = await find
      .sort({ createdAt: params.sort === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.messageModel.countDocuments(
      params.q
        ? { ...filter, $or: [{ body: new RegExp(params.q, 'i') }, { fromId: new RegExp(params.q, 'i') }, { toId: new RegExp(params.q, 'i') }] }
        : filter
    );

    return { items, total, page, limit };
  }
}