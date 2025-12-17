import { IsString, IsEnum, IsOptional, IsDateString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageStatus } from '../schemas/message.schema';

export class UpdateMessageStatusDto {
  @ApiProperty({ 
    enum: MessageStatus, 
    description: 'New message status (pending, sent, delivered, read, failed)',
    example: MessageStatus.DELIVERED,
    enumName: 'MessageStatus'
  })
  @IsEnum(MessageStatus)
  status: MessageStatus;

  @ApiPropertyOptional({ 
    description: 'External message ID from channel provider (WhatsApp message ID, etc.)',
    example: 'wamid.abc123def456',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  externalMessageId?: string;

  @ApiPropertyOptional({ 
    description: 'Error message description when status is failed',
    example: 'Message delivery failed: Invalid phone number',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ 
    description: 'ISO 8601 timestamp when the status change occurred',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time'
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional({ 
    description: 'Additional metadata about the status change',
    example: { channel_response: { code: 200 }, delivery_time_ms: 1500 },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
