import { Injectable, Logger } from '@nestjs/common';
import { NatsTransportService } from '../transports/nats-transport.service';
import { SendInstagramMessageDto } from './dto/send-message.dto';
import { CommentPublicationDto } from './dto/comment-publication.dto';
import { CommentReplyDto } from './dto/comment-reply.dto';
import { MentionReplyDto } from './dto/mention-reply.dto';
import { MediaUploadDto } from './dto/media-upload.dto';
import { MediaPublishDto } from './dto/media-publish.dto';
import { CheckVideoUploadDto } from './dto/check-video-upload.dto';
import { PublicationPutDto } from './dto/publication-put.dto';
import { PublicationDeleteDto } from './dto/publication-delete.dto';
import { InsightsMediaDto } from './dto/insights-media.dto';
import { PostsGetDto } from './dto/posts-get.dto';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private readonly nats: NatsTransportService) {}

  async send(dto: SendInstagramMessageDto) {
    this.logger.log(`Sending IG message to ${dto.recipientId} from ${dto.senderId}`);
    const result = await this.nats.send<{ success: boolean; remoteIds?: string[] }>(
      'send_instagram_message',
      dto,
    );
    this.logger.log(`IG message result: ${JSON.stringify(result)}`);
    return result;
  }

  async commentPublication(dto: CommentPublicationDto) {
    return this.nats.send('instagram.comment.publication.post', dto);
  }

  async commentReply(dto: CommentReplyDto) {
    return this.nats.send('instagram.comment.reply.post', dto);
  }

  async mentionReply(dto: MentionReplyDto) {
    return this.nats.send('instagram.mention.reply.post', dto);
  }

  async mediaUpload(dto: MediaUploadDto) {
    const subjectMap = {
      image: 'instagram.media.upload.image',
      video: 'instagram.media.upload.video',
      reel: 'instagram.media.upload.reel',
    } as const;
    const subject = subjectMap[dto.type];
    return this.nats.send(subject, dto);
  }

  async mediaPublish(dto: MediaPublishDto) {
    return this.nats.send('instagram.media.publish', dto);
  }

  async checkVideoUpload(dto: CheckVideoUploadDto) {
    return this.nats.send('instagram.media.checkVideoUpload', dto);
  }

  async publicationPut(dto: PublicationPutDto) {
    return this.nats.send('instagram.publication.put', dto);
  }

  async publicationDelete(dto: PublicationDeleteDto) {
    return this.nats.send('instagram.publication.delete', dto);
  }

  async insightsMedia(dto: InsightsMediaDto) {
    return this.nats.send('instagram.insights.media.get', dto);
  }

  async postsGet(dto: PostsGetDto) {
    return this.nats.send('instagram.posts.get', dto);
  }
}
