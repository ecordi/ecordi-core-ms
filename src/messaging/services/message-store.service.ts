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
    
    const doc = await this.messageModel.create({
      taskId: params.taskId,
      companyId: params.companyId,
      channelType: params.channelType,
      connectionId: params.connectionId,
      direction: 'internal',
      messageId,
      type: 'text',
      body: params.body,
      kbFiles: params.kbFiles || [],
      status: 'received',
      isInternal: true,
      createdByUserId: params.userId,
    });

    return { messageId: doc.messageId, _id: doc._id };
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
}