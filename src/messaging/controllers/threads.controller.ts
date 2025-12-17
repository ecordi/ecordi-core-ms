import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Put,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ThreadsService } from '../services/threads.service';
import { CreateThreadDto } from '../dto/create-thread.dto';
import { ThreadResponseDto, ThreadListResponseDto } from '../dto/thread-response.dto';
import { Thread } from '../schemas/thread.schema';

@ApiTags('Threads')
@ApiBearerAuth()
// TODO: Enable auth guard when available
// @UseGuards(JwtAuthGuard)
@Controller('api/v1/core/threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new thread',
    description: 'Creates a new messaging thread for a specific channel and user. Threads are used to organize conversations and can be either direct messages (DM) or feed comments.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Thread created successfully',
    type: ThreadResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid input data - validation errors in request body'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Thread already exists for this channel and external user'
  })
  async create(@Body() createThreadDto: CreateThreadDto): Promise<Thread> {
    return this.threadsService.createThread(createThreadDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'List threads with pagination and filtering',
    description: 'Retrieves a paginated list of threads with optional filtering by company, channel type, and status. Supports sorting by creation date and last message timestamp.'
  })
  @ApiQuery({ 
    name: 'companyId', 
    required: false, 
    description: 'Filter threads by company ID',
    example: 'company-123'
  })
  @ApiQuery({ 
    name: 'channelType', 
    required: false, 
    description: 'Filter by channel type (whatsapp_cloud, email, etc.)',
    example: 'whatsapp_cloud'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by thread status (active, closed, archived)',
    example: 'active'
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
    example: 20,
    type: Number
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of threads retrieved successfully',
    type: ThreadListResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters'
  })
  async findAll(
    @Query('companyId') companyId?: string,
    @Query('channelType') channelType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    return this.threadsService.listThreads(companyId || '', {
      channelType,
      status: status as any,
      page: pageNum,
      limit: limitNum,
    });
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get thread by ID',
    description: 'Retrieves a specific thread by its unique identifier, including all thread details and metadata.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique thread identifier',
    example: 'thread-789'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thread found and returned successfully',
    type: ThreadResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Thread not found with the provided ID'
  })
  async findOne(@Param('id') id: string): Promise<Thread> {
    return this.threadsService.getThread(id);
  }

  @Put(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Close a thread',
    description: 'Marks a thread as closed, preventing new messages from being added. The thread remains accessible for viewing but is no longer active for conversation.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique thread identifier to close',
    example: 'thread-789'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thread closed successfully',
    type: ThreadResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Thread not found with the provided ID'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Thread is already closed or archived'
  })
  async close(@Param('id') id: string): Promise<Thread> {
    return this.threadsService.closeThread(id);
  }

  @Put(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Archive a thread',
    description: 'Archives a thread, moving it to long-term storage. Archived threads are hidden from active views but can still be searched and accessed when needed.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique thread identifier to archive',
    example: 'thread-789'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thread archived successfully',
    type: ThreadResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Thread not found with the provided ID'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Thread is already archived'
  })
  async archive(@Param('id') id: string): Promise<Thread> {
    return this.threadsService.archiveThread(id);
  }

  @Put(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Assign thread to internal user',
    description: 'Assigns a thread to a specific internal user (agent, support representative, etc.) for handling. This helps with workload distribution and accountability.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique thread identifier to assign',
    example: 'thread-789'
  })
  @ApiQuery({ 
    name: 'userId', 
    required: true,
    description: 'Internal user ID to assign the thread to',
    example: 'user-456'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thread assigned successfully to the specified user',
    type: ThreadResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid user ID provided'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Thread not found with the provided ID'
  })
  async assign(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<Thread> {
    return this.threadsService.assignThread(id, userId);
  }
  @Put(':id/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update thread tags',
    description: 'Updates the tags associated with a thread. Tags are used for categorization, filtering, and organization of conversations (e.g., "support", "billing", "urgent").'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Unique thread identifier to update tags for',
    example: 'thread-789'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thread tags updated successfully',
    type: ThreadResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid tags format - must be an array of strings'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Thread not found with the provided ID'
  })
  async updateTags(
    @Param('id') id: string,
    @Body() body: { tags: string[] },
  ): Promise<Thread> {
    return this.threadsService.addTags(id, body.tags);
  }
}
