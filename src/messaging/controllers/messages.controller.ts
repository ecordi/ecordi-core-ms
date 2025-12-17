import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from '../services/messages.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { UpdateMessageStatusDto } from '../dto/update-message-status.dto';
import { ReplyToThreadDto } from '../dto/reply-to-thread.dto';
import { MessageResponseDto, MessageListResponseDto, MessageStatsResponseDto } from '../dto/message-response.dto';
import { Message, MessageDirection, MessageType } from '../schemas/message.schema';
import { NatsTransportService } from '../../transports/nats-transport.service';
import { NatsOutboundMessagePayload } from '../interfaces/nats-contracts.interface';

@ApiTags('Messages')
@ApiBearerAuth()
// TODO: Enable auth guard when available
// @UseGuards(JwtAuthGuard)
@Controller('api/v1/core/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService, private readonly natsTransportService: NatsTransportService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new message',
    description: 'Creates a new message in the unified messaging system. Messages can be text, media, templates, interactive content, location, or contact information.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Message created successfully',
    type: MessageResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data - validation errors in request body'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Thread not found for the specified threadId'
  })
  async create(@Body() createMessageDto: CreateMessageDto): Promise<Message> {
    const message = await this.messagesService.createMessage(createMessageDto);
    
    // If it's an outbound message, publish to NATS for channel processing
    if (createMessageDto.direction === MessageDirection.OUTBOUND) {
      const natsPayload: NatsOutboundMessagePayload = {
        messageId: message.messageId,
        threadId: message.threadId,
        companyId: message.companyId,
        channelType: message.channelType,
        connectionId: message.connectionId,
        direction: 'outbound',
        type: message.type,
        fromId: message.fromId,
        toId: message.toId,
        timestamp: new Date().toISOString(),
        text: message.text,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType,
        mediaCaption: message.mediaCaption,
        templateName: message.templateName,
        templateLanguage: message.templateLanguage,
        templateParameters: message.templateParameters,
        replyToMessageId: message.replyToMessageId,
        metadata: message.metadata,
      };

      // Publish to appropriate channel
      const subject = `core.messages.send`;
      await this.natsTransportService.send(subject, natsPayload);
    }

    return message;
  }

  @Get()
  @ApiOperation({ 
    summary: 'List messages with pagination and filtering',
    description: 'Retrieves a paginated list of messages with optional filtering by thread, company, direction, and status. Supports sorting by creation date.'
  })
  @ApiQuery({ 
    name: 'threadId', 
    required: false, 
    description: 'Filter messages by thread ID',
    example: 'thread-789'
  })
  @ApiQuery({ 
    name: 'companyId', 
    required: false, 
    description: 'Filter messages by company ID',
    example: 'company-123'
  })
  @ApiQuery({ 
    name: 'direction', 
    required: false, 
    description: 'Filter by message direction (inbound, outbound)',
    example: 'inbound'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by message status (pending, sent, delivered, read, failed)',
    example: 'delivered'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    type: Number
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Number of items per page (max 100)',
    example: 50,
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of messages retrieved successfully',
    type: MessageListResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters'
  })
  async findAll(
    @Query('threadId') threadId?: string,
    @Query('companyId') companyId?: string,
    @Query('direction') direction?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    
    const result = await this.messagesService.listMessages(companyId || '', {
      threadId,
      direction: direction as any,
      status: status as any,
      page: pageNum,
      limit: limitNum,
    });

    return {
      success: true,
      data: result.messages,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get message by ID',
    description: 'Retrieves a specific message by its unique identifier, including all message content and metadata.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique message identifier',
    example: 'msg-123'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Message found and returned successfully',
    type: MessageResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Message not found with the provided ID'
  })
  async findOne(@Param('id') id: string): Promise<Message> {
    return this.messagesService.getMessage(id);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update message status',
    description: 'Updates the delivery status of a message. Used by channel adapters to report message delivery, read receipts, or failures.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique message identifier to update',
    example: 'msg-123'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Message status updated successfully',
    type: MessageResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid status update data'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Message not found with the provided ID'
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateMessageStatusDto,
  ): Promise<Message> {
    return this.messagesService.updateStatus(id, updateStatusDto);
  }

  @Post('thread/:threadId/reply')
  @ApiOperation({ 
    summary: 'Reply to a thread',
    description: 'Sends a reply message to an existing thread. The message will be published to the appropriate channel adapter for delivery.'
  })
  @ApiParam({ 
    name: 'threadId', 
    description: 'Unique thread identifier to reply to',
    example: 'thread-789'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Reply message created and queued for delivery',
    type: MessageResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid reply data or missing required fields'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Thread not found with the provided ID'
  })
  async replyToThread(
    @Param('threadId') threadId: string,
    @Body() replyDto: ReplyToThreadDto,
  ): Promise<Message> {
    const createMessageDto: CreateMessageDto = {
      ...replyDto,
      threadId,
      direction: MessageDirection.OUTBOUND,
      type: replyDto.text ? MessageType.TEXT : replyDto.templateName ? MessageType.TEMPLATE : MessageType.TEXT,
    };

    const message = await this.messagesService.createMessage(createMessageDto);

    // Publish to NATS for channel processing
    const natsPayload: NatsOutboundMessagePayload = {
      messageId: message.messageId,
      threadId: message.threadId,
      companyId: message.companyId,
      channelType: message.channelType,
      connectionId: message.connectionId,
      direction: 'outbound',
      type: message.type,
      fromId: message.fromId,
      toId: message.toId,
      timestamp: new Date().toISOString(),
      text: message.text,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      mediaCaption: message.mediaCaption,
      templateName: message.templateName,
      templateLanguage: message.templateLanguage,
      templateParameters: message.templateParameters,
      replyToMessageId: message.replyToMessageId,
      metadata: message.metadata,
    };

    const subject = `core.messages.send`;
    await this.natsTransportService.send(subject, natsPayload);

    return message;
  }

  @Get('stats/:companyId')
  @ApiOperation({ 
    summary: 'Get message statistics for a company',
    description: 'Retrieves comprehensive message statistics including counts by direction, status, and channel type for a specific time period.'
  })
  @ApiParam({ 
    name: 'companyId', 
    description: 'Company ID to get statistics for',
    example: 'company-123'
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    description: 'Start date for statistics period (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    description: 'End date for statistics period (ISO 8601 format)',
    example: '2024-01-31T23:59:59.999Z'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Message statistics retrieved successfully',
    type: MessageStatsResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid date format or date range'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Company not found or no data available'
  })
  async getStats(
    @Param('companyId') companyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    const stats = await this.messagesService.getMessageStats(companyId, 30);

    return {
      success: true,
      data: stats,
    };
  }
}
