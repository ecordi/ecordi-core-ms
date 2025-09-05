import { Controller, Get, Put, Query, Param, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { TasksService } from '../services/tasks.service';

@ApiTags('Tasks')
@Controller('core/tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);

  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks for a company' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: true })
  @ApiQuery({ name: 'limit', description: 'Number of tasks to return', required: false, type: Number })
  @ApiQuery({ name: 'offset', description: 'Number of tasks to skip', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async findAll(
    @Query('companyId') companyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    if (!companyId) {
      throw new HttpException('companyId is required', HttpStatus.BAD_REQUEST);
    }

    this.logger.debug(`GET /tasks - companyId: ${companyId}, limit: ${limit}, offset: ${offset}`);

    const limitNum = parseInt(limit, 10) || 50;
    const offsetNum = parseInt(offset, 10) || 0;

    const tasks = await this.tasksService.findAll(companyId, limitNum, offsetNum);
    
    this.logger.log(`📋 Found ${tasks.length} tasks for company: ${companyId}`);
    
    return tasks;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics for a company' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Task statistics retrieved successfully' })
  async getStats(@Query('companyId') companyId: string) {
    if (!companyId) {
      throw new HttpException('companyId is required', HttpStatus.BAD_REQUEST);
    }

    return this.tasksService.getStats(companyId);
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a specific task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: true })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(
    @Param('taskId') taskId: string,
    @Query('companyId') companyId: string
  ) {
    if (!companyId) {
      throw new HttpException('companyId is required', HttpStatus.BAD_REQUEST);
    }

    const task = await this.tasksService.findById(taskId, companyId);
    
    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    return task;
  }

  @Put(':taskId/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiQuery({ name: 'companyId', description: 'Company ID', required: true })
  @ApiQuery({ name: 'status', description: 'New status', required: true, enum: ['open', 'closed', 'archived'] })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async updateStatus(
    @Param('taskId') taskId: string,
    @Query('companyId') companyId: string,
    @Query('status') status: 'open' | 'closed' | 'archived'
  ) {
    if (!companyId) {
      throw new HttpException('companyId is required', HttpStatus.BAD_REQUEST);
    }

    if (!['open', 'closed', 'archived'].includes(status)) {
      throw new HttpException('Invalid status', HttpStatus.BAD_REQUEST);
    }

    const task = await this.tasksService.updateStatus(taskId, companyId, status);
    
    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    this.logger.log(`📝 Updated task ${taskId} status to: ${status}`);
    
    return { success: true, task };
  }
}
