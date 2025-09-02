import { Controller, Post, Body, Headers, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ChannelEventDto } from '../dtos/channel-event.dto';
import { ChannelIngestionService } from '../services/channel-ingestion.service';

@ApiTags('channels')
@Controller('v1/channels')
export class ChannelsController {
  private readonly logger = new Logger(ChannelsController.name);

  constructor(private readonly channelIngestionService: ChannelIngestionService) {}

  @Post('events')
  @ApiOperation({ 
    summary: 'Ingest channel events',
    description: 'Receives normalized events from channel microservices and processes them through the messaging pipeline'
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Unique key for idempotent processing (format: companyId:connectionId:remoteId)',
    required: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Event processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        messageId: { type: 'string' },
        processed: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid event data' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Event already processed (idempotency)' 
  })
  async ingestChannelEvent(
    @Body() eventDto: ChannelEventDto,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    this.logger.log(`📥 Received ${eventDto.direction} ${eventDto.type} event from ${eventDto.channel}: ${eventDto.remoteId}`);

    try {
      // Generate idempotency key if not provided
      const finalIdempotencyKey = idempotencyKey || 
        `${eventDto.companyId}:${eventDto.connectionId}:${eventDto.remoteId}`;

      // Process the event through the ingestion service
      const result = await this.channelIngestionService.processChannelEvent(eventDto, finalIdempotencyKey);

      this.logger.log(`✅ Event processed: ${eventDto.remoteId} -> ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        processed: result.processed,
        idempotencyKey: finalIdempotencyKey
      };

    } catch (error) {
      this.logger.error(`❌ Failed to process event ${eventDto.remoteId}: ${error.message}`, error.stack);
      
      if (error.code === 11000) {
        // MongoDB duplicate key error (idempotency)
        throw new HttpException(
          `Event already processed: ${eventDto.remoteId}`,
          HttpStatus.CONFLICT
        );
      }

      throw new HttpException(
        `Failed to process event: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
