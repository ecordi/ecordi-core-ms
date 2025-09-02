import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ChannelEventDto } from '../dtos/channel-event.dto';

export interface AttachmentDto {
  fileId: string;
  id: string;
  name: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  originalMediaId: string;
  caption?: string;
  sha256?: string;
}

export interface ProcessAttachmentsRequest {
  eventDto: ChannelEventDto;
  companyId: string;
}

/**
 * Service for processing message attachments
 * Fetches media from channels and stores ONLY in Files-MS (centralized storage)
 */
@Injectable()
export class ProcessAttachmentsService {
  private readonly logger = new Logger(ProcessAttachmentsService.name);

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * Process attachments from incoming messages
   * 1. Fetch binary data from channel via NATS
   * 2. Upload to Files-MS with metadata (centralized storage)
   * 3. Return normalized attachment DTOs
   */
  async processAttachments(request: ProcessAttachmentsRequest): Promise<AttachmentDto[]> {
    const { eventDto } = request;
    
    if (!eventDto.media?.length) {
      return [];
    }

    const processedAttachments: AttachmentDto[] = [];

    for (const mediaItem of eventDto.media) {
      try {
        // 1. Fetch media from Channel-MS via NATS
        const mediaResponse = await firstValueFrom(
          this.natsClient.send('channel.media.fetch', {
            mediaId: mediaItem.mediaId,
            connectionId: eventDto.connectionId,
            companyId: eventDto.companyId
          })
        );

        if (!(mediaResponse as any)?.success || !(mediaResponse as any)?.data) {
          this.logger.warn(`Failed to fetch media ${mediaItem.mediaId}: ${(mediaResponse as any)?.error}`);
          continue;
        }

        // 2. Store ONLY in Files-MS (centralized storage)
        const uploadPayload = {
          file: (mediaResponse as any).data, // Base64 or buffer
          filename: mediaItem.fileName || `${mediaItem.mediaId}.${this.getExtensionFromMimeType(mediaItem.mimeType)}`,
          mimeType: mediaItem.mimeType,
          companyId: eventDto.companyId,
          metadata: {
            channel: eventDto.channel,
            connectionId: eventDto.connectionId,
            messageRemoteId: eventDto.remoteId,
            direction: eventDto.direction,
            originalMediaId: mediaItem.mediaId,
            tags: ['whatsapp', 'attachment', eventDto.direction],
            source: 'messaging'
          }
        };

        const fileResponse = await firstValueFrom(
          this.natsClient.send('files.upload', uploadPayload)
        );

        if ((fileResponse as any)?.success) {
          processedAttachments.push({
            fileId: (fileResponse as any).data.id,
            id: (fileResponse as any).data.id,
            name: (fileResponse as any).data.filename,
            filename: (fileResponse as any).data.filename,
            mimeType: mediaItem.mimeType,
            size: (fileResponse as any).data.size,
            url: (fileResponse as any).data.downloadUrl || (fileResponse as any).data.url,
            originalMediaId: mediaItem.mediaId,
            caption: mediaItem.caption,
            sha256: mediaItem.sha256
          });

          this.logger.debug(`📎 Processed attachment: ${mediaItem.mediaId} → Files-MS: ${(fileResponse as any).data.id}`);
        } else {
          this.logger.error(`Failed to store attachment ${mediaItem.mediaId} in Files-MS: ${(fileResponse as any)?.error}`);
        }

      } catch (error) {
        this.logger.error(`Error processing attachment ${mediaItem.mediaId}:`, error);
      }
    }

    return processedAttachments;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt'
    };

    return mimeMap[mimeType] || 'bin';
  }
}
