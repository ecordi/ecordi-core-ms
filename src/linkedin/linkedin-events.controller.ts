import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  HttpCode,
  HttpStatus,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LinkedInEventsService } from './linkedin-events.service';
import { LinkedInWebhookEventDto } from './dto/linkedin-webhook-event.dto';
import { StrictValidationPipe } from '../common/validation.pipe';
// import { AuthGuard } from '@nestjs/passport'; // Uncomment when auth is ready

@ApiTags('LinkedIn Events')
@Controller('api/v1/core/linkedin/events')
export class LinkedInEventsController {
  constructor(private readonly linkedInEventsService: LinkedInEventsService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Process LinkedIn webhook event',
    description: 'Receives and processes webhook events from LinkedIn API (organization social actions, etc.)'
  })
  @ApiBody({ type: LinkedInWebhookEventDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Webhook event processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'EVENT_RECEIVED' },
        eventId: { type: 'string', example: 'linkedin_1234567890_abc123' }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid webhook payload' })
  async processWebhook(@Body(new StrictValidationPipe()) eventDto: LinkedInWebhookEventDto) {
    const event = await this.linkedInEventsService.processWebhookEvent(eventDto);
    return { 
      success: true, 
      message: 'EVENT_RECEIVED',
      eventId: event.eventId
    };
  }

  @Get('connection/:connectionId')
  @ApiOperation({ 
    summary: 'Get events by connection',
    description: 'Retrieves LinkedIn events for a specific connection'
  })
  @ApiParam({ name: 'connectionId', description: 'LinkedIn connection ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of events to return', example: 50 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Events retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventId: { type: 'string' },
              type: { type: 'string' },
              processed: { type: 'boolean' },
              delivered: { type: 'boolean' },
              receivedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  async getEventsByConnection(
    @Param('connectionId') connectionId: string,
    @Query('limit') limit?: number
  ) {
    const events = await this.linkedInEventsService.findEventsByConnection(
      connectionId, 
      limit ? parseInt(limit.toString()) : 50
    );
    return { success: true, events };
  }

  @Get('company/:companyId')
  @ApiOperation({ 
    summary: 'Get events by company',
    description: 'Retrieves LinkedIn events for all connections of a specific company'
  })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of events to return', example: 50 })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Events retrieved successfully' 
  })
  async getEventsByCompany(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: number
  ) {
    const events = await this.linkedInEventsService.findEventsByCompany(
      companyId, 
      limit ? parseInt(limit.toString()) : 50
    );
    return { success: true, events };
  }
}
