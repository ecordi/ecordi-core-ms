import { Controller, Get, Post, Query, Body, Param, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('WhatsApp Webhooks')
@Controller('api/v1/channels/whatsapp')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('verify')
  @ApiOperation({ summary: 'Verify WhatsApp webhook' })
  @ApiQuery({ name: 'hub.mode', description: 'Webhook mode' })
  @ApiQuery({ name: 'hub.challenge', description: 'Webhook challenge' })
  @ApiQuery({ name: 'hub.verify_token', description: 'Webhook verify token' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: false })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  @ApiResponse({ status: 403, description: 'Webhook verification failed' })
  async verifyWebhook(
    @Query('hub.mode') hubMode: string,
    @Query('hub.challenge') hubChallenge: string,
    @Query('hub.verify_token') hubVerifyToken: string,
    @Query('companyId') companyId?: string
  ): Promise<string> {
    const challenge = await this.webhooksService.verifyWebhook(hubMode, hubChallenge, hubVerifyToken, companyId);
    
    if (!challenge) {
      throw new HttpException('Webhook verification failed', HttpStatus.FORBIDDEN);
    }
    
    return challenge;
  }

  @Get('verify/:companyId')
  @ApiOperation({ summary: 'Verify WhatsApp webhook for specific company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'hub.mode', description: 'Webhook mode' })
  @ApiQuery({ name: 'hub.challenge', description: 'Webhook challenge' })
  @ApiQuery({ name: 'hub.verify_token', description: 'Webhook verify token' })
  @ApiResponse({ status: 200, description: 'Webhook verified successfully' })
  @ApiResponse({ status: 403, description: 'Webhook verification failed' })
  async verifyWebhookForCompany(
    @Param('companyId') companyId: string,
    @Query('hub.mode') hubMode: string,
    @Query('hub.challenge') hubChallenge: string,
    @Query('hub.verify_token') hubVerifyToken: string
  ): Promise<string> {
    const challenge = await this.webhooksService.verifyWebhook(hubMode, hubChallenge, hubVerifyToken, companyId);
    
    if (!challenge) {
      throw new HttpException('Webhook verification failed', HttpStatus.FORBIDDEN);
    }
    
    return challenge;
  }
}

@Controller('api/v1/channels')
export class ChannelWebhooksController {
  private readonly logger = new Logger(ChannelWebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('events')
  @ApiOperation({ summary: 'Handle incoming WhatsApp messages' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: false })
  @ApiBody({ description: 'WhatsApp webhook payload' })
  @ApiResponse({ status: 200, description: 'Event processed successfully' })
  async handleEvents(
    @Body() payload: any,
    @Query('companyId') companyId?: string
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received webhook event for company: ${companyId}`);
    await this.webhooksService.handleIncomingMessage(payload, companyId);
    return { success: true };
  }

  @Post('events/:companyId')
  @ApiOperation({ summary: 'Handle incoming WhatsApp messages for specific company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiBody({ description: 'WhatsApp webhook payload' })
  @ApiResponse({ status: 200, description: 'Event processed successfully' })
  async handleEventsForCompany(
    @Param('companyId') companyId: string,
    @Body() payload: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received webhook event for company: ${companyId}`);
    await this.webhooksService.handleIncomingMessage(payload, companyId);
    return { success: true };
  }

  @Post('messageStatus')
  @ApiOperation({ summary: 'Handle WhatsApp message status updates' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: false })
  @ApiBody({ description: 'WhatsApp message status payload' })
  @ApiResponse({ status: 200, description: 'Status update processed successfully' })
  async handleMessageStatus(
    @Body() payload: any,
    @Query('companyId') companyId?: string
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received message status update for company: ${companyId}`);
    await this.webhooksService.handleMessageStatus(payload, companyId);
    return { success: true };
  }

  @Post('messageStatus/:companyId')
  @ApiOperation({ summary: 'Handle WhatsApp message status updates for specific company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiBody({ description: 'WhatsApp message status payload' })
  @ApiResponse({ status: 200, description: 'Status update processed successfully' })
  async handleMessageStatusForCompany(
    @Param('companyId') companyId: string,
    @Body() payload: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received message status update for company: ${companyId}`);
    await this.webhooksService.handleMessageStatus(payload, companyId);
    return { success: true };
  }

  @Post('status')
  @ApiOperation({ summary: 'Handle WhatsApp status updates' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: false })
  @ApiBody({ description: 'WhatsApp status payload' })
  @ApiResponse({ status: 200, description: 'Status update processed successfully' })
  async handleStatus(
    @Body() payload: any,
    @Query('companyId') companyId?: string
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received status update for company: ${companyId}`);
    await this.webhooksService.handleStatusUpdate(payload, companyId);
    return { success: true };
  }

  @Post('status/:companyId')
  @ApiOperation({ summary: 'Handle WhatsApp status updates for specific company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiBody({ description: 'WhatsApp status payload' })
  @ApiResponse({ status: 200, description: 'Status update processed successfully' })
  async handleStatusForCompany(
    @Param('companyId') companyId: string,
    @Body() payload: any
  ): Promise<{ success: boolean }> {
    this.logger.log(`Received status update for company: ${companyId}`);
    await this.webhooksService.handleStatusUpdate(payload, companyId);
    return { success: true };
  }
}
