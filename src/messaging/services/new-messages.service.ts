import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProcessChannelEventDto, CreateInternalNoteDto, SendOutboundMessageDto } from '../dto/process-channel-event.dto';
import { MessageStoreService } from './message-store.service';
import { Task, TaskDocument } from '../../tasks/schemas/task.schema';
import { ProcessAttachmentsService, AttachmentDto } from '../helpers/process-attachments';

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
  constructor(
    private readonly store: MessageStoreService,
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
    private readonly attachmentsService: ProcessAttachmentsService,
  ) {}

  async processChannelEvent(dto: ProcessChannelEventDto) {
    const channelType = dto.channel === 'whatsapp' ? 'whatsapp_cloud' : dto.channel;
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
    const task = await this.taskModel.findOne({ _id: new Types.ObjectId(dto.taskId), companyId: dto.companyId }).exec();
    if (!task) throw new Error('Task not found');

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

    return { success: true, messageId: queued.messageId, dbId: queued._id.toString() };
  }

  async listTaskMessages(taskId: string, includeInternal: boolean) {
    const msgs = await this.store.listByTask({ taskId, includeInternal });
    return msgs.map(m => ({
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
    }));
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
