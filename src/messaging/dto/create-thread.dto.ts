import { IsString, IsEnum, IsOptional, IsArray, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThreadType } from '../schemas/thread.schema';

export class CreateThreadDto {
  @ApiProperty({ 
    description: 'Company ID that owns this thread',
    example: 'company-123',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  companyId: string;

  @ApiProperty({ 
    enum: ThreadType, 
    description: 'Type of thread - DM for direct messages, feed_comment for social media comments',
    example: ThreadType.DM,
    enumName: 'ThreadType'
  })
  @IsEnum(ThreadType)
  type: ThreadType;

  @ApiProperty({ 
    description: 'Channel type identifier (whatsapp_cloud, email, telegram, etc.)',
    example: 'whatsapp_cloud',
    minLength: 1,
    maxLength: 50
  })
  @IsString()
  channelType: string;

  @ApiProperty({ 
    description: 'Connection ID that handles this channel',
    example: 'conn-456',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  connectionId: string;

  @ApiProperty({ 
    description: 'External user identifier (phone number for WhatsApp, email address, etc.)',
    example: '5493515551234',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  externalUserId: string;

  @ApiPropertyOptional({ 
    description: 'Internal user ID of the agent handling this thread',
    example: 'user-789',
    minLength: 1,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  internalUserId?: string;

  @ApiPropertyOptional({ 
    description: 'Thread subject or title',
    example: 'Customer Support Inquiry',
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ 
    description: 'Array of tags for categorizing the thread',
    type: [String],
    example: ['support', 'urgent', 'billing'],
    maxItems: 20
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Thread priority level from 1 (lowest) to 5 (highest)',
    minimum: 1,
    maximum: 5,
    example: 3,
    default: 1
  })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ 
    description: 'Feed post ID when thread type is feed_comment',
    example: 'post-123',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  feedPostId?: string;

  @ApiPropertyOptional({ 
    description: 'Parent comment ID for nested comment threads',
    example: 'comment-456',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  parentCommentId?: string;

  @ApiPropertyOptional({ 
    description: 'Additional metadata as key-value pairs',
    example: { source: 'website', campaign: 'summer2024' },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
