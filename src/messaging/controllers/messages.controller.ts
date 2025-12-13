import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EnsureCompanyInterceptor } from '../../common/interceptors/ensure-company.interceptor';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { MessageStoreService } from '../services/message-store.service';

@ApiTags('Messages')
@UseInterceptors(EnsureCompanyInterceptor)
@Controller('api/v1/core/messages')
export class MessagesController {
  constructor(private readonly messageStore: MessageStoreService) {}

  @Get()
  @ApiOperation({ summary: 'List company messages with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  @ApiQuery({ name: 'direction', required: false, enum: ['inbound', 'outbound', 'internal'] })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'received'] })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'From date (ISO)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'To date (ISO)' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search in body/fromId/toId' })
  @ApiQuery({ name: 'sort', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'includeInternal', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async listCompanyMessages(
    @CompanyId() companyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('taskId') taskId?: string,
    @Query('direction') direction?: 'inbound' | 'outbound' | 'internal',
    @Query('type') type?: string,
    @Query('status') status?: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('includeInternal') includeInternal?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;

    const result = await this.messageStore.listCompanyMessages({
      companyId,
      page: p,
      limit: l,
      taskId,
      direction,
      type,
      status,
      from,
      to,
      q,
      sort,
      includeInternal: includeInternal === undefined ? undefined : includeInternal === 'true',
    });

    return {
      page: result.page,
      limit: result.limit,
      total: result.total,
      items: result.items,
    };
  }
}
