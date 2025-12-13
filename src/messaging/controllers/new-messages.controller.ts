import { Controller, Post, Get, Body, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NewMessagesService } from '../services/new-messages.service';
import { ProcessChannelEventDto, CreateInternalNoteDto, SendOutboundMessageDto } from '../dto/process-channel-event.dto';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@ApiTags('messages')
@Controller('messages')
export class NewMessagesController {
  constructor(private readonly newMessagesService: NewMessagesService) {}

  @Post('channel-event')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Process incoming channel event' })
  @ApiResponse({ status: 201, description: 'Event processed successfully' })
  async processChannelEvent(@Body() dto: ProcessChannelEventDto) {
    return this.newMessagesService.processChannelEvent(dto);
  }

  @Post('internal-note')
  @ApiOperation({ summary: 'Create internal note' })
  @ApiResponse({ status: 201, description: 'Internal note created successfully' })
  async createInternalNote(@Body() dto: CreateInternalNoteDto) {
    return this.newMessagesService.createInternalNote(dto);
  }

  @Post('outbound')
  @ApiOperation({ summary: 'Send outbound message' })
  @ApiResponse({ status: 201, description: 'Outbound message queued successfully' })
  async sendOutbound(@Body() dto: SendOutboundMessageDto) {
    return this.newMessagesService.sendOutbound(dto);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'List messages for a task' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async listTaskMessages(
    @Param('taskId') taskId: string,
    @Query('includeInternal') includeInternal?: string,
  ) {
    const includeInternalBool = includeInternal === 'true';
    return this.newMessagesService.listTaskMessages(taskId, includeInternalBool);
  }

  @Get('task/:taskId/details')
  @ApiOperation({ summary: 'Get task details' })
  @ApiResponse({ status: 200, description: 'Task details retrieved successfully' })
  async getTaskDetails(
    @Param('taskId') taskId: string,
    @Query('companyId') companyId: string,
  ) {
    return this.newMessagesService.getTaskById(taskId, companyId);
  }

  @Get('company/:companyId/tasks')
  @ApiOperation({ summary: 'List company tasks' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async listCompanyTasks(
    @Param('companyId') companyId: string,
    @Query('status') status?: 'open' | 'closed' | 'archived',
    @Query('channelType') channelType?: string,
    @Query('connectionId') connectionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const options = {
      status,
      channelType,
      connectionId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    return this.newMessagesService.listCompanyTasks(companyId, options);
  }
}