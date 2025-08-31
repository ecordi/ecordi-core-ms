import { Body, Controller, Post } from '@nestjs/common';
import { MessagingService } from './messaging.service';

@Controller('messaging/whatsapp')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post('send')
  async send(@Body() body: { companyId: string; connectionId: string; senderId: string; recipientId: string; messages: Array<{ type: string; text?: string; template?: any }>; source?: string }) {
    return this.messaging.send(body);
  }
}
