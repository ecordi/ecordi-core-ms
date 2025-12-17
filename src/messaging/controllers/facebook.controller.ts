import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NatsTransportService } from '../../transports/nats-transport.service';

class SendFacebookMessageDto {
  senderId!: string; // page connectionId
  recipientId!: string; // user id
  messages!: Array<{ text?: string; attachment?: { type: string; payload: { url: string } } }>;
}

class FacebookRegisterDto {
  userId!: string;
  token!: string; // short-lived user token from Facebook login
  webhooks?: Array<{ type: 'httpRequest'; action: string; params?: { headers?: Record<string, string> } }>;
}

class FacebookFeedDto {
  senderId!: string; // page connectionId
  post?: { message?: string; link?: string; place?: string; targeting?: Record<string, any> };
  media?: { type?: 'photo' | 'video'; url?: string; photos?: string[]; pathVideo?: string; title?: string };
  postId?: string;
  action?: 'create' | 'update' | 'delete';
}

class FacebookCommentDto {
  senderId!: string; // page connectionId
  target!: { type: 'post' | 'comment'; id: string };
  comment?: string;
  image?: string;
  action?: 'create' | 'update' | 'delete';
  commentId?: string;
}

@ApiTags('facebook')
@Controller('api/v1/core/facebook')
export class FacebookController {
  constructor(private readonly nats: NatsTransportService) {}

  @Post('messages/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send Facebook Messenger messages via Channel-MS' })
  async sendMessage(@Body() dto: SendFacebookMessageDto) {
    const result = await this.nats.sendFacebookMessage(dto);
    return result;
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register Facebook pages using user token (exchange to page tokens)' })
  async register(@Body() dto: FacebookRegisterDto) {
    const result = await this.nats.registerFacebookConnection(dto);
    return result;
  }

  @Post('feed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish/Update/Delete Facebook posts' })
  async publishFeed(@Body() dto: FacebookFeedDto) {
    const result = await this.nats.publishFacebookFeed(dto);
    return result;
  }

  @Post('comment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish/Update/Delete Facebook comments' })
  async publishComment(@Body() dto: FacebookCommentDto) {
    const result = await this.nats.publishFacebookComment(dto);
    return result;
  }
}
