import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { connect, NatsConnection, Msg } from 'nats';
import { ConfigService } from '@nestjs/config';
import { MessagingWebSocketGateway } from '../../websocket/websocket.gateway';
import { Message, MessageDocument } from '../schemas/message.schema';
import { ProcessAttachmentsService, AttachmentDto } from '../helpers/process-attachments';
import { MessagingService } from '../messaging.service';
import { ChannelEventDto } from '../dtos/channel-event.dto';
import { ThreadService } from '../services/thread.service';
import { MessageStoreService } from '../services/message-store.service';

@Injectable()
export class ChannelEventsConsumer implements OnModuleInit {
  private readonly logger = new Logger(ChannelEventsConsumer.name);
  private natsConnection: NatsConnection;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    private readonly processAttachmentsService: ProcessAttachmentsService,
    private readonly messagingService: MessagingService,
    private readonly websocketGateway: MessagingWebSocketGateway,
    private readonly threadService: ThreadService,
    private readonly messageStoreService: MessageStoreService,
  ) {}

  async onModuleInit() {
    setTimeout(async () => {
      await this.connectAndSubscribe();
    }, 5000);
  }

  private async connectAndSubscribe() {
    try {
      this.natsConnection = await connect({
        servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
      });
      
      // Subscribe to JetStream subject pattern that Channel-MS publishes to
      const sub = this.natsConnection.subscribe('js.channel.whatsapp.message.received.*.*.*');
      
      this.logger.log('🎯 Subscribed to: js.channel.whatsapp.message.received.*.*.*');
      this.logger.log('NATS consumer started for channel events');

      (async () => {
        for await (const msg of sub) {
          await this.handleChannelEventSimple(msg);
        }
      })();

    } catch (error) {
      this.logger.error('Failed to connect to NATS:', error);
    }
  }

  async handleChannelEventSimple(msg: Msg) {
    try {
      const rawData = new TextDecoder().decode(msg.data);
      this.logger.debug(`Raw NATS message data: ${rawData}`);
      
      // Parse NATS message - handle direct format (no wrapper)
      const eventData = JSON.parse(rawData);
      
      if (!eventData) {
        this.logger.error('❌ No event data in NATS message');
        return;
      }
      
      // Map the event data to ChannelEventDto format
      const eventDto: ChannelEventDto & { channelType?: string } = {
        channel: 'whatsapp',
        channelType: eventData.channelType || 'whatsapp_cloud',
        direction: eventData.direction === 'inbound' ? 'incoming' : 'outgoing',
        companyId: eventData.companyId,
        connectionId: eventData.connectionId,
        senderId: eventData.senderId || eventData.fromId,
        recipientId: eventData.toId,
        remoteId: eventData.remoteId || eventData.externalMessageId,
        timestamp: new Date(eventData.timestamp).getTime(),
        type: eventData.type,
        body: eventData.text,
        providerRaw: eventData.rawPayload
      };

      // If message is media, build media array expected by attachment processor
      if (['image', 'video', 'audio', 'document'].includes(eventDto.type)) {
        const payload = eventData.rawPayload || {};
        const mediaNode = payload?.[eventDto.type];
        if (mediaNode?.id) {
          (eventDto as any).media = [{
            mediaId: mediaNode.id,
            mimeType: mediaNode.mime_type || mediaNode.mimeType || 'application/octet-stream',
            fileName: mediaNode.filename || undefined,
            caption: mediaNode.caption || undefined,
            sha256: mediaNode.sha256 || undefined,
            size: mediaNode.size || undefined,
          }];
        }
        // Also carry top-level mediaUrl if present to allow fallback when no fetcher is available
        (eventDto as any).mediaUrl = eventData.mediaUrl || undefined;
      }
      
      this.logger.log(`🔥 RECEIVED NATS MESSAGE: ${eventDto.remoteId} from ${eventDto.senderId}`);
      
      await this.processChannelEvent(eventDto);
    } catch (error) {
      this.logger.error(`Failed to process channel event: ${error.message}`, error.stack);
    }
  }

  async processChannelEvent(eventDto: ChannelEventDto): Promise<void> {
    try {
      this.logger.debug(`Processing ${eventDto.direction} message: ${eventDto.remoteId}`);

      // 1. Check if message already exists (idempotency)
      const existingMessage = await this.messageModel.findOne({ 
        remoteId: eventDto.remoteId,
        connectionId: eventDto.connectionId 
      });
      
      if (existingMessage) {
        this.logger.debug(`Message already processed: ${eventDto.remoteId}`);
        return;
      }

      // 2. Process attachments if media exists
      let attachments: AttachmentDto[] = [];
      if (eventDto.media && eventDto.media.length > 0) {
        this.logger.debug(`Processing ${eventDto.media.length} attachments for message ${eventDto.remoteId}`);
        attachments = await this.processAttachmentsService.processAttachments({
          eventDto: eventDto,
          companyId: eventDto.companyId
        });

        this.logger.log(`✅ Processed ${attachments.length} attachments for message ${eventDto.remoteId}`);
      }

      // 2b. Fallback: if no attachments processed and we have a direct mediaUrl, synthesize an attachment entry
      if ((!attachments || attachments.length === 0) && (eventDto as any).mediaUrl) {
        try {
          const mediaNode = (eventDto as any).providerRaw?.[eventDto.type] || {};
          const url: string = (eventDto as any).mediaUrl;
          const guessedName = url.split('/').pop() || `${eventDto.remoteId}.${(mediaNode.mime_type?.split('/')?.[1] || 'bin')}`;
          attachments = [{
            fileId: '',
            id: (mediaNode.id || eventDto.remoteId),
            name: guessedName,
            filename: guessedName,
            mimeType: mediaNode.mime_type || 'application/octet-stream',
            size: mediaNode.size || 0,
            url,
            originalMediaId: mediaNode.id || eventDto.remoteId,
            caption: mediaNode.caption,
            sha256: mediaNode.sha256,
          }];
          this.logger.debug(`📎 Fallback attachment synthesized from mediaUrl for message ${eventDto.remoteId}`);
        } catch (e) {
          this.logger.warn(`Failed to synthesize fallback attachment: ${(e as any)?.message}`);
        }
      }

      // 3. Find or create task if needed
      const task = await this.findOrCreateTask(eventDto);

      // 4. Find or create thread (grouped by taskId if task exists)
      const thread = await this.findOrCreateThread(eventDto, task?.id);

      // 5. Create message document with thread reference
      const messageDoc = await this.createMessage(eventDto, attachments, thread, task?.id);

      // 6. Update thread with new message info
      await this.threadService.updateThreadOnNewMessage(
        thread._id,
        eventDto.body || (attachments.length > 0 ? 'Media message' : 'Message')
      );

      // 7. Update attachments with taskId if task was created
      if (task && attachments.length > 0) {
        await this.updateAttachmentsWithTaskId(attachments, task.id);
      }

      // 8. Create comment/entry in task
      await this.createTaskComment(eventDto, messageDoc, attachments, task);

      // 9. Publish real-time event to frontend
      await this.publishRealtimeEvent(eventDto, messageDoc, attachments, thread);

      this.logger.log(`✅ Successfully processed ${eventDto.direction} message: ${eventDto.remoteId}`);

    } catch (error) {
      this.logger.error(`❌ Failed to process channel event ${eventDto.remoteId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find or create thread, grouped by taskId if available
   */
  private async findOrCreateThread(eventDto: ChannelEventDto, taskId?: string): Promise<any> {
    const threadData = {
      companyId: eventDto.companyId,
      channel: eventDto.channel,
      connectionId: eventDto.connectionId,
      remoteThreadId: eventDto.senderId, // Use senderId as thread identifier
      contactId: eventDto.senderId,
      contactName: eventDto.senderId,
      contactPhone: eventDto.senderId && eventDto.senderId.includes('@') ? eventDto.senderId.split('@')[0] : eventDto.senderId,
      metadata: {
        lastEventType: eventDto.type,
        lastEventDirection: eventDto.direction
      }
    };

    if (taskId) {
      // Create/find thread grouped by taskId
      return await this.threadService.findOrCreateByTaskId(
        eventDto.companyId,
        taskId,
        threadData
      );
    } else {
      // Create/find regular DM thread
      return await this.threadService.findOrCreateByRemoteId(
        eventDto.companyId,
        eventDto.senderId,
        eventDto.connectionId,
        threadData
      );
    }
  }

  private async createMessage(
    eventDto: ChannelEventDto, 
    attachments: AttachmentDto[], 
    thread: any,
    taskId?: string
  ): Promise<MessageDocument> {
    // Get next sequence number for this thread
    const lastMessage = await this.messageModel
      .findOne({ threadId: thread._id })
      .sort({ sequenceNumber: -1 })
      .exec();
    
    const sequenceNumber = ((lastMessage as any)?.sequenceNumber || 0) + 1;

    const taskObjectId = taskId && Types.ObjectId.isValid(taskId) ? new Types.ObjectId(taskId) : new Types.ObjectId();

    const messageData: any = {
      // Use provider remote id as messageId for idempotency with schema's unique index
      messageId: eventDto.remoteId,
      companyId: eventDto.companyId,
      channelType: (eventDto as any).channelType || (eventDto.channel === 'whatsapp' ? 'whatsapp_cloud' : eventDto.channel),
      connectionId: eventDto.connectionId,
      direction: eventDto.direction === 'incoming' ? 'inbound' : 'outbound',
      fromId: eventDto.senderId,
      toId: eventDto.recipientId,
      type: eventDto.type as any,
      body: eventDto.body,
      remoteId: eventDto.remoteId,
      status: eventDto.direction === 'incoming' ? 'received' : 'sent',
      raw: eventDto.providerRaw,
      taskId: taskObjectId,
      threadId: thread._id,
      sequenceNumber: sequenceNumber,
      providerTimestamp: new Date(eventDto.timestamp),
      
      // Files from Files-MS
      kbFiles: attachments.map(att => ({
        fileId: att.fileId,
        url: att.url,
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        caption: att.caption,
        sha256: att.sha256,
      })),
    };

    try {
      const message = new this.messageModel(messageData);
      const savedMessage = await message.save();
      this.logger.log(`💾 MESSAGE SAVED TO MONGODB: ${savedMessage._id} - ${eventDto.remoteId}`);
      return savedMessage;
    } catch (error: any) {
      if (error?.code === 11000) {
        // Handle duplicate key error gracefully
        this.logger.debug(`Message already exists, fetching existing: ${eventDto.remoteId}`);
        const existing = await this.messageModel.findOne({ 
          connectionId: eventDto.connectionId, 
          remoteId: eventDto.remoteId 
        }).exec();
        if (existing) {
          this.logger.log(`💾 EXISTING MESSAGE FOUND: ${existing._id} - ${eventDto.remoteId}`);
          return existing;
        }
      }
      throw error;
    }
  }

  private async findOrCreateTask(eventDto: ChannelEventDto): Promise<any> {
    try {
      this.logger.debug(`Finding/creating task for conversation ${eventDto.senderId} <-> ${eventDto.recipientId}`);
      
      const task = await this.messageStoreService.findOrCreateTaskForConversation({
        companyId: eventDto.companyId,
        channelType: (eventDto as any).channelType || 'whatsapp_cloud',
        connectionId: eventDto.connectionId,
        customerId: eventDto.senderId
      });

      this.logger.log(`📋 Task found/created: ${task._id} for customer ${eventDto.senderId}`);
      
      return {
        id: task._id.toString(),
        _id: task._id,
        conversationId: `conv_${eventDto.companyId}_${eventDto.senderId}_${eventDto.recipientId}`,
        companyId: eventDto.companyId,
        status: task.status,
        channel: eventDto.channel,
        assignedTo: null
      };
    } catch (error) {
      this.logger.error(`Failed to find/create task: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async updateAttachmentsWithTaskId(attachments: AttachmentDto[], taskId: string): Promise<void> {
    // TODO: Update files in files-ms with taskId
    this.logger.debug(`Updating ${attachments.length} attachments with taskId: ${taskId}`);
    
    for (const attachment of attachments) {
      try {
        // Call files-ms API to update file with taskId
        // await this.httpService.patch(`${FILES_MS_URL}/api/v1/files/${attachment.fileId}`, { taskId });
      } catch (error) {
        this.logger.warn(`Failed to update attachment ${attachment.fileId} with taskId: ${error.message}`);
      }
    }
  }

  private async createTaskComment(
    eventDto: ChannelEventDto, 
    message: MessageDocument, 
    attachments: AttachmentDto[], 
    task: any
  ): Promise<void> {
    // TODO: Create comment/entry in task system
    this.logger.debug(`Creating task comment for message ${eventDto.remoteId} in task ${task.id}`);
    
    const commentData = {
      taskId: task.id,
      messageId: (message as any).messageId,
      content: eventDto.body || 'Media message',
      attachments: attachments,
      author: eventDto.senderId,
      direction: eventDto.direction,
      timestamp: new Date(eventDto.timestamp),
      channel: eventDto.channel
    };

    // This would integrate with your task/CRM system
    this.logger.debug('Task comment created', commentData);
  }

  private async publishRealtimeEvent(
    eventDto: ChannelEventDto, 
    messageDoc: MessageDocument, 
    attachments: AttachmentDto[],
    thread: any
  ): Promise<void> {
    try {
      const realtimePayload = {
        messageId: messageDoc._id.toString(),
        threadId: thread._id.toString(),
        taskId: (messageDoc as any).taskId,
        companyId: eventDto.companyId,
        channel: eventDto.channel,
        connectionId: eventDto.connectionId,
        direction: eventDto.direction,
        senderId: eventDto.senderId,
        senderName: eventDto.senderId,
        recipientId: eventDto.recipientId,
        type: eventDto.type,
        text: eventDto.body,
        attachments: attachments,
        kbFiles: (messageDoc as any).kbFiles,
        sequenceNumber: (messageDoc as any).sequenceNumber,
        timestamp: (messageDoc as any).createdAt,
        thread: {
          id: thread._id.toString(),
          type: thread.type,
          contactName: thread.contactName,
          messageCount: thread.messageCount + 1
        }
      };

      // Emit to company room for real-time updates
      this.websocketGateway.emitMessageCreated(eventDto.companyId, realtimePayload);
      
      // If message belongs to a task, emit to task-specific room
      if (messageDoc.taskId) {
        this.websocketGateway.emitTaskMessageCreated(messageDoc.taskId.toString(), realtimePayload);
      }

      this.logger.debug(`Real-time event published for message ${messageDoc._id}`);
    } catch (error) {
      this.logger.error(`Failed to publish real-time event: ${error.message}`);
    }
  }
}
