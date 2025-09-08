import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FacebookService } from './facebook.service';
import { SendFacebookMessageDto } from './dto/send-facebook-message.dto';
import { FacebookRegisterDto } from './dto/facebook-register.dto';
import { FacebookFeedDto } from './dto/facebook-feed.dto';
import { FacebookCommentDto } from './dto/facebook-comment.dto';

@ApiTags('facebook')
@Controller('core/facebook')
export class FacebookController {
  constructor(private readonly facebook: FacebookService) {}

  @Post('messages/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send Facebook Messenger messages via Channel-MS' })
  async sendMessage(@Body() dto: SendFacebookMessageDto) {
    return this.facebook.sendMessages(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register Facebook pages using user token (exchange to page tokens)' })
  async register(@Body() dto: FacebookRegisterDto) {
    return this.facebook.register(dto);
  }

  @Post('feed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish/Update/Delete Facebook posts' })
  async publishFeed(@Body() dto: FacebookFeedDto) {
    return this.facebook.publishFeed(dto);
  }

  @Post('comment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish/Update/Delete Facebook comments' })
  async publishComment(@Body() dto: FacebookCommentDto) {
    return this.facebook.publishComment(dto);
  }
}
