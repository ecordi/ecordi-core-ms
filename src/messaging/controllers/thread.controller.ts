import {
  Controller,
  Get,
  Put,
  Query,
  Param,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ThreadService, ThreadWithMessages } from '../services/thread.service';
import { EnsureCompanyInterceptor } from '../../common/interceptors/ensure-company.interceptor';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('Threads')
@UseInterceptors(EnsureCompanyInterceptor)
@Controller('api/v1/core/threads')
export class ThreadController {
  constructor(private readonly threadService: ThreadService) {}

  /**
   * Get thread with messages by taskId
   */
  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get thread messages by taskId' })
  @ApiParam({ name: 'taskId', description: 'Task ID to fetch thread for' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false, type: Number })
  @ApiQuery({ name: 'limit', description: 'Messages per page', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Thread with messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        thread: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            companyId: { type: 'string' },
            taskId: { type: 'string' },
            type: { type: 'string', enum: ['dm', 'task', 'group'] },
            contactId: { type: 'string' },
            contactName: { type: 'string' },
            messageCount: { type: 'number' },
            lastMessageAt: { type: 'string', format: 'date-time' },
            lastMessageText: { type: 'string' },
            status: { type: 'string', enum: ['active', 'archived', 'closed'] }
          }
        },
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              companyId: { type: 'string' },
              threadId: { type: 'string' },
              taskId: { type: 'string' },
              direction: { type: 'string', enum: ['incoming', 'outgoing'] },
              senderId: { type: 'string' },
              recipientId: { type: 'string' },
              type: { type: 'string' },
              text: { type: 'string' },
              kbFiles: { type: 'array' },
              attachments: { type: 'array' },
              status: { type: 'string' },
              sequenceNumber: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        totalMessages: { type: 'number' },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async getThreadByTaskId(
    @Param('taskId') taskId: string,
    @CompanyId() companyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ): Promise<{
    thread: any;
    messages: any[];
    totalMessages: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const result = await this.threadService.getThreadByTaskId(
      companyId,
      taskId,
      pageNum,
      limitNum
    );

    if (!result) {
      throw new HttpException('Thread not found', HttpStatus.NOT_FOUND);
    }

    return {
      thread: result.thread,
      messages: result.messages,
      totalMessages: result.totalMessages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.totalMessages / limitNum)
      }
    };
  }

  /**
   * Get all threads for a company
   */
  @Get()
  @ApiOperation({ summary: 'Get all threads for a company' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false, type: Number })
  @ApiQuery({ name: 'limit', description: 'Threads per page', required: false, type: Number })
  @ApiQuery({ name: 'status', description: 'Thread status filter', required: false, enum: ['active', 'archived', 'closed'] })
  @ApiQuery({ name: 'channel', description: 'Channel filter (whatsapp, instagram, linkedin, email, ...)', required: false })
  @ApiQuery({ name: 'type', description: 'Thread type filter', required: false, enum: ['dm', 'task', 'group'] })
  @ApiQuery({ name: 'connectionId', description: 'Filter by connectionId', required: false })
  @ApiQuery({ name: 'contactId', description: 'Filter by contactId', required: false })
  @ApiQuery({ name: 'from', description: 'From date (ISO)', required: false })
  @ApiQuery({ name: 'to', description: 'To date (ISO)', required: false })
  @ApiQuery({ name: 'q', description: 'Free-text search (contact name/phone/email or last message)', required: false })
  @ApiResponse({
    status: 200,
    description: 'Threads retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        threads: { type: 'array' },
        total: { type: 'number' },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  async getThreadsByCompany(
    @CompanyId() companyId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status: string = 'active',
    @Query('channel') channel?: string,
    @Query('type') type?: 'dm' | 'task' | 'group',
    @Query('connectionId') connectionId?: string,
    @Query('contactId') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
  ): Promise<{
    threads: any[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    const result = await this.threadService.getThreadsByCompany(
      companyId,
      pageNum,
      limitNum,
      status,
      { channel, type, connectionId, contactId, from, to, q }
    );

    return {
      threads: result.threads,
      total: result.total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.total / limitNum)
      }
    };
  }

  /**
   * Archive thread
   */
  @Put(':threadId/archive')
  @ApiOperation({ summary: 'Archive a thread' })
  @ApiParam({ name: 'threadId', description: 'Thread ID to archive' })
  @ApiResponse({ status: 200, description: 'Thread archived successfully' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async archiveThread(
    @Param('threadId') threadId: string,
    @CompanyId() companyId: string
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.threadService.archiveThread(companyId, threadId);
    
    if (!success) {
      throw new HttpException('Thread not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Thread archived successfully'
    };
  }

  /**
   * Close thread
   */
  @Put(':threadId/close')
  @ApiOperation({ summary: 'Close a thread' })
  @ApiParam({ name: 'threadId', description: 'Thread ID to close' })
  @ApiResponse({ status: 200, description: 'Thread closed successfully' })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  async closeThread(
    @Param('threadId') threadId: string,
    @CompanyId() companyId: string
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.threadService.closeThread(companyId, threadId);
    
    if (!success) {
      throw new HttpException('Thread not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Thread closed successfully'
    };
  }

  /**
   * Get thread statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get thread statistics for a company' })
  @ApiResponse({
    status: 200,
    description: 'Thread statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        active: { type: 'number' },
        archived: { type: 'number' },
        closed: { type: 'number' },
        totalMessages: { type: 'number' }
      }
    }
  })
  async getThreadStats(
    @CompanyId() companyId: string
  ): Promise<{
    active: number;
    archived: number;
    closed: number;
    totalMessages: number;
  }> {
    return await this.threadService.getThreadStats(companyId);
  }
}
