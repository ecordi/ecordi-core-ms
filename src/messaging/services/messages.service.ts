import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageDocument, MessageStatus, MessageDirection } from '../schemas/message.schema';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageStatusDto } from '../dto/update-message-status.dto';
import { NatsInboundMessagePayload, NatsOutboundMessagePayload, NatsMessageStatusPayload } from '../interfaces/nats-contracts.interface';
import { ThreadsService } from './threads.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private threadsService: ThreadsService,
  ) {}

  /**
   * Create or update a message from inbound NATS payload
   */
  async upsertInboundMessage(payload: NatsInboundMessagePayload): Promise<MessageDocument> {
    const { messageId, externalMessageId } = payload;

    // Try to find existing message by messageId or externalMessageId
    let message = await this.messageModel.findOne({
      $or: [
        { messageId },
        ...(externalMessageId ? [{ externalMessageId, channelType: payload.channelType }] : []),
      ],
    }).exec();

    if (message) {
      // Update existing message
      Object.assign(message, {
        ...payload,
        status: MessageStatus.DELIVERED, // Inbound messages are considered delivered
        deliveredAt: new Date(payload.timestamp),
      });
      await message.save();
      this.logger.log(`Updated inbound message: ${messageId}`);
    } else {
      // Create new message
      message = new this.messageModel({
        ...payload,
        messageId: messageId || uuidv4(),
        status: MessageStatus.DELIVERED,
        deliveredAt: new Date(payload.timestamp),
      });
      await message.save();
      this.logger.log(`Created inbound message: ${message.messageId}`);
    }

    // Update thread's last message timestamp
    if (message.threadId) {
      await this.threadsService.updateLastMessageAt(message.threadId, new Date(payload.timestamp));
    }

    return message;
  }

  /**
   * Create an outbound message
   */
  async createOutboundMessage(payload: NatsOutboundMessagePayload): Promise<MessageDocument> {
    const messageId = payload.messageId || uuidv4();

    const message = new this.messageModel({
      ...payload,
      messageId,
      status: MessageStatus.PENDING,
    });

    await message.save();
    this.logger.log(`Created outbound message: ${messageId}`);

    // Update thread's last message timestamp
    if (message.threadId) {
      await this.threadsService.updateLastMessageAt(message.threadId);
    }

    return message;
  }

  /**
   * Create a message manually
   */
  async createMessage(createMessageDto: CreateMessageDto): Promise<MessageDocument> {
    const messageId = uuidv4();
    
    const message = new this.messageModel({
      messageId,
      ...createMessageDto,
      status: createMessageDto.direction === MessageDirection.INBOUND 
        ? MessageStatus.DELIVERED 
        : MessageStatus.PENDING,
    });

    await message.save();
    this.logger.log(`Created message: ${messageId}`);

    // Update thread's last message timestamp
    await this.threadsService.updateLastMessageAt(message.threadId);

    return message;
  }

  /**
   * Update message status from NATS payload
   */
  async updateMessageStatus(payload: NatsMessageStatusPayload): Promise<MessageDocument> {
    const { messageId, externalMessageId, status, timestamp, errorMessage } = payload;

    this.logger.log(`🔍 Attempting to update message status:`, {
      messageId,
      externalMessageId,
      status,
      timestamp
    });

    const message = await this.messageModel.findOne({
      $or: [
        { messageId },
        ...(externalMessageId ? [{ externalMessageId }] : []),
      ],
    }).exec();

    if (!message) {
      this.logger.error(`❌ Message not found for status update:`, {
        searchedMessageId: messageId,
        searchedExternalMessageId: externalMessageId,
        status
      });
      
      // Let's also search for similar messages to debug
      const similarMessages = await this.messageModel.find({
        $or: [
          { messageId: { $regex: messageId?.substring(0, 10) || '', $options: 'i' } },
          { externalMessageId: { $regex: externalMessageId?.substring(0, 10) || '', $options: 'i' } }
        ]
      }).limit(5).exec();
      
      this.logger.debug(`🔍 Found ${similarMessages.length} similar messages:`, 
        similarMessages.map(m => ({ 
          messageId: m.messageId, 
          externalMessageId: m.externalMessageId,
          status: m.status,
          direction: m.direction 
        }))
      );
      
      throw new NotFoundException(`Message not found: ${messageId || externalMessageId}`);
    }

    this.logger.log(`✅ Found message to update:`, {
      foundMessageId: message.messageId,
      foundExternalMessageId: message.externalMessageId,
      currentStatus: message.status,
      newStatus: status,
      direction: message.direction
    });

    // Update status and timestamps
    message.status = status as MessageStatus;
    
    switch (status) {
      case 'sent':
        message.sentAt = new Date(timestamp);
        break;
      case 'delivered':
        message.deliveredAt = new Date(timestamp);
        break;
      case 'read':
        message.readAt = new Date(timestamp);
        break;
      case 'failed':
        message.failedAt = new Date(timestamp);
        message.errorMessage = errorMessage;
        break;
    }

    if (externalMessageId && !message.externalMessageId) {
      message.externalMessageId = externalMessageId;
    }

    await message.save();
    this.logger.log(`Updated message ${message.messageId} status to ${status}`);

    return message;
  }

  /**
   * Update message status manually
   */
  async updateStatus(messageId: string, updateDto: UpdateMessageStatusDto): Promise<MessageDocument> {
    const message = await this.getMessage(messageId);
    
    message.status = updateDto.status;
    
    const timestamp = updateDto.timestamp ? new Date(updateDto.timestamp) : new Date();
    
    switch (updateDto.status) {
      case MessageStatus.SENT:
        message.sentAt = timestamp;
        break;
      case MessageStatus.DELIVERED:
        message.deliveredAt = timestamp;
        break;
      case MessageStatus.READ:
        message.readAt = timestamp;
        break;
      case MessageStatus.FAILED:
        message.failedAt = timestamp;
        message.errorMessage = updateDto.errorMessage;
        break;
    }

    if (updateDto.externalMessageId) {
      message.externalMessageId = updateDto.externalMessageId;
    }

    if (updateDto.metadata) {
      message.metadata = { ...message.metadata, ...updateDto.metadata };
    }

    await message.save();
    this.logger.log(`Updated message ${messageId} status to ${updateDto.status}`);

    return message;
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<MessageDocument> {
    const message = await this.messageModel.findOne({ messageId }).exec();
    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }
    return message;
  }

  /**
   * List messages for a thread with pagination
   */
  async listMessagesByThread(
    threadId: string,
    options: {
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<{ messages: MessageDocument[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 50, sortOrder = 'asc' } = options;

    const sort: any = { createdAt: sortOrder === 'desc' ? -1 : 1 };
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel.find({ threadId }).sort(sort).skip(skip).limit(limit).exec(),
      this.messageModel.countDocuments({ threadId }).exec(),
    ]);

    return { messages, total, page, limit };
  }

  /**
   * List messages for a company with pagination and filters
   */
  async listMessages(
    companyId: string,
    options: {
      threadId?: string;
      status?: MessageStatus;
      direction?: MessageDirection;
      channelType?: string;
      connectionId?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<{ messages: MessageDocument[]; total: number; page: number; limit: number }> {
    const {
      threadId,
      status,
      direction,
      channelType,
      connectionId,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const filter: any = { companyId };
    if (threadId) filter.threadId = threadId;
    if (status) filter.status = status;
    if (direction) filter.direction = direction;
    if (channelType) filter.channelType = channelType;
    if (connectionId) filter.connectionId = connectionId;

    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);

    return { messages, total, page, limit };
  }

  /**
   * Get message statistics for a company
   */
  async getMessageStats(companyId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.messageModel.aggregate([
      {
        $match: {
          companyId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            direction: '$direction',
            status: '$status',
            channelType: '$channelType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$count' },
          byDirection: {
            $push: {
              direction: '$_id.direction',
              status: '$_id.status',
              channelType: '$_id.channelType',
              count: '$count',
            },
          },
        },
      },
    ]).exec();

    return stats[0] || { total: 0, byDirection: [] };
  }

  /**
   * Delete old messages (for cleanup)
   */
  async deleteOldMessages(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.messageModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    }).exec();

    this.logger.log(`Deleted ${result.deletedCount} old messages older than ${days} days`);
    return result.deletedCount;
  }
}
