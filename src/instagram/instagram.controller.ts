import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstagramService } from './instagram.service';
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

@ApiTags('instagram')
@Controller('api/v1/instagram')
export class InstagramController {
  constructor(private readonly instagram: InstagramService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send Instagram message via NATS to Instagram Channel MS' })
  async send(@Body() dto: SendInstagramMessageDto) {
    return this.instagram.send(dto);
  }

  @Post('comment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a comment on a publication' })
  async commentPublication(@Body() dto: CommentPublicationDto) {
    return this.instagram.commentPublication(dto);
  }

  @Post('comment/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a comment' })
  async commentReply(@Body() dto: CommentReplyDto) {
    return this.instagram.commentReply(dto);
  }

  @Post('mention/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a mention (media/comment)'} )
  async mentionReply(@Body() dto: MentionReplyDto) {
    return this.instagram.mentionReply(dto);
  }

  @Post('media/upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload media (image, video, reel)' })
  async mediaUpload(@Body() dto: MediaUploadDto) {
    return this.instagram.mediaUpload(dto);
  }

  @Post('media/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish media by creationId' })
  async mediaPublish(@Body() dto: MediaPublishDto) {
    return this.instagram.mediaPublish(dto);
  }

  @Post('media/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check video upload status' })
  async checkVideoUpload(@Body() dto: CheckVideoUploadDto) {
    return this.instagram.checkVideoUpload(dto);
  }

  @Post('publication')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update publication (message/link/place)' })
  async publicationPut(@Body() dto: PublicationPutDto) {
    return this.instagram.publicationPut(dto);
  }

  @Post('publication/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete publication' })
  async publicationDelete(@Body() dto: PublicationDeleteDto) {
    return this.instagram.publicationDelete(dto);
  }

  @Post('insights/media')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get media insights' })
  async insightsMedia(@Body() dto: InsightsMediaDto) {
    return this.instagram.insightsMedia(dto);
  }

  @Post('posts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get account posts' })
  async postsGet(@Body() dto: PostsGetDto) {
    return this.instagram.postsGet(dto);
  }
}
