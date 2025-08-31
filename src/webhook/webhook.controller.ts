import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Logger, Post, Query, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { WebhookService } from './webhook.service';
import { ApiBody, ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('webhooks')
@ApiTags('Webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly service: WebhookService) {}

  @Get('whatsapp')
  @ApiOperation({ summary: 'Verificación del webhook de WhatsApp (Meta)' })
  @ApiQuery({ name: 'hub.mode', required: true })
  @ApiQuery({ name: 'hub.verify_token', required: true })
  @ApiQuery({ name: 'hub.challenge', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Echo del challenge cuando el verify_token es válido' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
  async verify(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string, @Res() res: Response) {
    if (mode === 'subscribe' && token && this.service.verifyToken(token)) {
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepción de eventos de WhatsApp (Meta)' })
  @ApiHeader({ name: 'x-hub-signature-256', required: true, description: 'Firma HMAC SHA256 de Meta' })
  @ApiBody({ description: 'Payload de eventos de Meta', schema: { type: 'object', additionalProperties: true } })
  @ApiResponse({ status: HttpStatus.OK, description: 'EVENT_RECEIVED' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Invalid signature' })
  async receive(@Req() req: Request, @Headers('x-hub-signature-256') signature: string | undefined, @Body() body: any, @Res() res: Response) {
    const raw = (req as any).rawBody || JSON.stringify(body);
    const ok = this.service.verifySignature(raw, signature);
    const bodyStr = JSON.stringify(body);
    if (!ok) {
      this.logger.warn(`[WEBHOOK][WA] Incoming body: ${bodyStr} → Signature INVALID`);
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }
    this.logger.log(`[WEBHOOK][WA] Incoming body: ${bodyStr} → Signature OK`);

    await this.service.processWebhook(body);

    this.logger.log(`[WEBHOOK][WA] 200 EVENT_RECEIVED.`);
    return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
  }
}
