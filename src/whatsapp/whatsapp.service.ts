import { Injectable, Logger } from '@nestjs/common';
import { MessagingService } from '../messaging/messaging.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly messaging: MessagingService) {}

  async sendText(input: { companyId: string; connectionId?: string; connectionRefId?: string; phoneNumberId?: string; to: string; text: string }) {
    return this.messaging.sendText(input.connectionId, input.to, input.text);
  }

  async sendTemplate(input: { companyId: string; connectionId?: string; connectionRefId?: string; phoneNumberId?: string; to: string; name: string; language: { code: string }; components?: any[] }) {
    const templateParams = input.components?.map(comp => comp.parameters?.[0]?.text || '') || [];
    return this.messaging.sendTemplate(input.connectionId, input.to, input.name, templateParams);
  }
}
