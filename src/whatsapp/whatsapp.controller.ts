import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { StrictValidationPipe } from '../common/validation.pipe';
import { SendTextDto } from './dto/send-text.dto';
import { SendTemplateDto } from './dto/send-template.dto';
import { WhatsAppService } from './whatsapp.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly wa: WhatsAppService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a text message' })

  @ApiBody({ type: SendTextDto })
  
  @ApiResponse({ status: HttpStatus.OK, description: 'Text message sent', type: SendTextDto })
  async sendText(@Body(new StrictValidationPipe()) dto: SendTextDto) {
    return this.wa.sendText(dto);
  }

  @Post('send-template')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a template message' })
  @ApiBody({ type: SendTemplateDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Template message sent', type: SendTemplateDto })
  async sendTemplate(@Body(new StrictValidationPipe()) dto: SendTemplateDto) {
    return this.wa.sendTemplate(dto);
  }
}
