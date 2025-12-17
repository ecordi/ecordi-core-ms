import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProcessChannelEventDto, CreateInternalNoteDto, SendOutboundMessageDto } from '../dto/process-channel-event.dto';
import { MessageStoreService } from './message-store.service';
import { Task, TaskDocument } from '../../tasks/schemas/task.schema';
import { ProcessAttachmentsService, AttachmentDto } from '../helpers/process-attachments';
import { NatsTransportService } from '../../transports/nats-transport.service';
import { ContactsService } from '../../contacts/services/contacts.service';

export type UploadedFileRef = {
  fileId: string;
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
  caption?: string;
  sha256?: string;
};

@Injectable()
export class NewMessagesService {
  private readonly logger = new Logger(NewMessagesService.name);

  constructor(
    private readonly store: MessageStoreService,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly attachmentsService: ProcessAttachmentsService,
    private readonly natsTransport: NatsTransportService,
    private readonly contactsService: ContactsService,
  ) {}

  async processChannelEvent(dto: ProcessChannelEventDto) {
    const channelType = dto.channel === 'whatsapp' ? 'whatsapp_cloud' : dto.channel;
    
    // Create or update contact information
    let contact = null;
    try {
      contact = await this.contactsService.findOrCreateContact(
        dto.companyId,
        dto.senderId,
        {
          name: dto.senderName || dto.senderId,
          whatsappName: dto.senderName,
          metadata: {
            isWhatsAppUser: channelType === 'whatsapp_cloud',
            lastSeen: new Date(),
          },
        }
      );
      this.logger.log(`Contact processed: ${contact._id} for phone: ${dto.senderId}`);
    } catch (error) {
      this.logger.error(`Failed to process contact for ${dto.senderId}: ${error.message}`);
    }

    const task = await this.store.findOrCreateTaskForConversation({
      companyId: dto.companyId,
      channelType,
      connectionId: dto.connectionId,
      customerId: dto.senderId,
    });

    let kbFiles: UploadedFileRef[] = [];
    if (dto.media && dto.media.length > 0) {
      // Convert media to attachments using existing service
      const attachments = await this.attachmentsService.processAttachments({
        eventDto: {
          ...dto,
          media: dto.media.map(m => ({
            mediaId: m.mediaId,
            mimeType: m.mimeType,
            fileName: m.fileName,
            caption: m.caption,
            sha256: m.sha256,
            size: m.size,
            url: m.url
          }))
        } as any,
        companyId: dto.companyId
      });

      kbFiles = attachments.map(att => ({
        fileId: att.fileId,
        url: att.url,
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        caption: att.caption,
        sha256: att.sha256
      }));
    }

    const saved = await this.store.saveInboundIdempotent({
      taskId: task._id as Types.ObjectId,
      companyId: dto.companyId,
      channelType,
      connectionId: dto.connectionId,
      type: dto.type,
      fromId: dto.senderId,
      toId: dto.recipientId,
      body: dto.body,
      remoteId: dto.remoteId,
      kbFiles,
      providerTimestamp: new Date(dto.timestamp),
      raw: dto.providerRaw,
    });

    return { success: true, taskId: task._id.toString(), messageId: saved.messageId, dbId: saved._id.toString() };
  }

  async createInternalNote(dto: CreateInternalNoteDto) {
    const task = await this.taskModel.findOne({ _id: new Types.ObjectId(dto.taskId), companyId: dto.companyId }).exec();
    if (!task) throw new Error('Task not found');

    let kbFiles: UploadedFileRef[] = [];
    if (dto.media && dto.media.length > 0) {
      const attachments = await this.attachmentsService.processAttachments({
        eventDto: {
          companyId: dto.companyId,
          channel: task.channelType,
          connectionId: task.connectionId,
          direction: 'internal',
          media: dto.media.map(m => ({
            mediaId: m.mediaId,
            mimeType: m.mimeType,
            fileName: m.fileName,
            caption: m.caption,
            sha256: m.sha256,
            size: m.size,
            url: m.url
          }))
        } as any,
        companyId: dto.companyId
      });

      kbFiles = attachments.map(att => ({
        fileId: att.fileId,
        url: att.url,
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        caption: att.caption,
        sha256: att.sha256
      }));
    }

    const saved = await this.store.saveInternalNote({
      taskId: task._id as Types.ObjectId,
      companyId: task.companyId,
      channelType: task.channelType,
      connectionId: task.connectionId,
      body: dto.body,
      kbFiles,
      userId: dto.userId,
    });
    return { success: true, messageId: saved.messageId, dbId: saved._id.toString() };
  }

  async sendOutbound(dto: SendOutboundMessageDto) {
    this.logger.debug(`Looking for task: ${dto.taskId} in company: ${dto.companyId}`);
    
    const task = await this.taskModel.findOne({ _id: new Types.ObjectId(dto.taskId), companyId: dto.companyId }).exec();
    if (!task) {
      this.logger.error(`Task not found: ${dto.taskId} in company: ${dto.companyId}`);
      // Try to find any task for debugging
      const allTasks = await this.taskModel.find({ companyId: dto.companyId }).limit(5).exec();
      this.logger.debug(`Available tasks for company ${dto.companyId}:`, allTasks.map(t => ({ id: t._id, customerId: t.customerId })));
      throw new Error(`Task not found: ${dto.taskId}`);
    }

    let kbFiles: UploadedFileRef[] = [];
    if (dto.media && dto.media.length > 0) {
      const attachments = await this.attachmentsService.processAttachments({
        eventDto: {
          companyId: dto.companyId,
          channel: task.channelType,
          connectionId: task.connectionId,
          direction: 'outbound',
          media: dto.media.map(m => ({
            mediaId: m.mediaId,
            mimeType: m.mimeType,
            fileName: m.fileName,
            caption: m.caption,
            sha256: m.sha256,
            size: m.size,
            url: m.url
          }))
        } as any,
        companyId: dto.companyId
      });

      kbFiles = attachments.map(att => ({
        fileId: att.fileId,
        url: att.url,
        name: att.name,
        mimeType: att.mimeType,
        size: att.size,
        caption: att.caption,
        sha256: att.sha256
      }));
    }

    const queued = await this.store.saveOutboundQueued({
      taskId: task._id as Types.ObjectId,
      companyId: task.companyId,
      channelType: task.channelType,
      connectionId: task.connectionId,
      type: dto.type,
      fromId: 'agent',
      toId: dto.recipientId,
      body: dto.body,
      kbFiles,
    });

    // Send message to Channel-MS via NATS
    this.logger.log(`Sending outbound message to Channel-MS: ${queued.messageId}`);
    try {
      const natsPayload = {
        messageId: queued.messageId,
        companyId: task.companyId,
        connectionId: task.connectionId,
        recipientId: dto.recipientId,
        message: {
          type: dto.type,
          text: dto.type === 'text' ? { body: dto.body } : undefined,
          template: dto.type === 'template' ? JSON.parse(dto.body) : undefined
        }
      };

      // Use the existing NATS transport to send to Channel-MS and wait for response
      const response = await this.natsTransport.send('send_whatsapp_message', natsPayload);
      this.logger.log(`Message sent to Channel-MS successfully: ${queued.messageId}`, { response });
      
      // Update message with WhatsApp messageId (wamid) if received in response
      if (response && response.messageId) {
        this.logger.log(`Updating message ${queued.messageId} with WhatsApp messageId: ${response.messageId}`);
        await this.store.updateMessageRemoteId(queued.messageId, response.messageId, 'sent');
      } else {
        this.logger.warn(`No WhatsApp messageId received in response for message: ${queued.messageId}`, { response });
      }
    } catch (error) {
      this.logger.error(`Failed to send message to Channel-MS: ${error.message}`);
      // Update message status to failed
      try {
        await this.store.updateMessageRemoteId(queued.messageId, '', 'failed');
      } catch (updateError) {
        this.logger.error(`Failed to update message status to failed: ${updateError.message}`);
      }
    }

    return { success: true, messageId: queued.messageId, dbId: queued._id.toString() };
  }

  async listTaskMessages(taskId: string, includeInternal: boolean) {
    const msgs = await this.store.listByTask({ taskId, includeInternal });
    
    // Get task to find company ID
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) {
      throw new Error('Task not found');
    }

    // Enrich messages with contact information
    const enrichedMessages = await Promise.all(
      msgs.map(async (m) => {
        let senderContact = null;
        let recipientContact = null;

        // Get sender contact info if it's an inbound message
        if (m.direction === 'inbound' && m.fromId) {
          try {
            senderContact = await this.contactsService.findByPhoneNumber(task.companyId, m.fromId);
          } catch (error) {
            this.logger.debug(`No contact found for sender ${m.fromId}`);
          }
        }

        // Get recipient contact info if it's an outbound message
        if (m.direction === 'outbound' && m.toId) {
          try {
            recipientContact = await this.contactsService.findByPhoneNumber(task.companyId, m.toId);
          } catch (error) {
            this.logger.debug(`No contact found for recipient ${m.toId}`);
          }
        }

        return {
          id: m._id.toString(),
          taskId: m.taskId.toString(),
          direction: m.direction,
          isInternal: m.isInternal,
          type: m.type,
          body: m.body,
          fromId: m.fromId,
          toId: m.toId,
          kbFiles: m.kbFiles,
          status: m.status,
          createdAt: (m as any).createdAt,
          // Contact enrichment
          senderContact: senderContact ? {
            id: senderContact._id.toString(),
            name: senderContact.name,
            phoneNumber: senderContact.phoneNumber,
            profilePicture: senderContact.profilePicture,
            whatsappName: senderContact.whatsappName,
          } : null,
          recipientContact: recipientContact ? {
            id: recipientContact._id.toString(),
            name: recipientContact.name,
            phoneNumber: recipientContact.phoneNumber,
            profilePicture: recipientContact.profilePicture,
            whatsappName: recipientContact.whatsappName,
          } : null,
        };
      })
    );

    return enrichedMessages;
  }

  async getTaskById(taskId: string, companyId: string) {
    const task = await this.taskModel.findOne({ 
      _id: new Types.ObjectId(taskId), 
      companyId 
    }).exec();
    
    if (!task) {
      throw new Error('Task not found');
    }

    return {
      id: task._id.toString(),
      companyId: task.companyId,
      channelType: task.channelType,
      connectionId: task.connectionId,
      customerId: task.customerId,
      subject: task.subject,
      status: task.status,
      participants: task.participants,
      lastMessageId: task.lastMessageId?.toString(),
      createdAt: (task as any).createdAt,
      updatedAt: (task as any).updatedAt,
    };
  }

  async listCompanyTasks(companyId: string, options: {
    status?: 'open' | 'closed' | 'archived';
    channelType?: string;
    connectionId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { status, channelType, connectionId, page = 1, limit = 50 } = options;
    
    const filter: any = { companyId };
    if (status) filter.status = status;
    if (channelType) filter.channelType = channelType;
    if (connectionId) filter.connectionId = connectionId;

    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      this.taskModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(filter).exec(),
    ]);

    return {
      tasks: tasks.map(task => ({
        id: task._id.toString(),
        companyId: task.companyId,
        channelType: task.channelType,
        connectionId: task.connectionId,
        customerId: task.customerId,
        subject: task.subject,
        status: task.status,
        participants: task.participants,
        lastMessageId: task.lastMessageId?.toString(),
        createdAt: (task as any).createdAt,
        updatedAt: (task as any).updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
