import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThreadType, ThreadStatus } from '../schemas/thread.schema';

export class ThreadResponseDto {
  @ApiProperty({
    description: 'Unique thread identifier',
    example: 'thread-789'
  })
  threadId: string;

  @ApiProperty({
    description: 'Company ID that owns this thread',
    example: 'company-123'
  })
  companyId: string;

  @ApiProperty({
    enum: ThreadType,
    description: 'Type of thread',
    example: ThreadType.DM,
    enumName: 'ThreadType'
  })
  type: ThreadType;

  @ApiProperty({
    enum: ThreadStatus,
    description: 'Current thread status',
    example: ThreadStatus.ACTIVE,
    enumName: 'ThreadStatus'
  })
  status: ThreadStatus;

  @ApiProperty({
    description: 'Channel type identifier',
    example: 'whatsapp_cloud'
  })
  channelType: string;

  @ApiProperty({
    description: 'Connection ID that handles this channel',
    example: 'conn-456'
  })
  connectionId: string;

  @ApiProperty({
    description: 'External user identifier',
    example: '5493515551234'
  })
  externalUserId: string;

  @ApiPropertyOptional({
    description: 'Internal user ID handling the thread',
    example: 'user-789'
  })
  internalUserId?: string;

  @ApiPropertyOptional({
    description: 'Thread subject or title',
    example: 'Customer Support Inquiry'
  })
  subject?: string;

  @ApiPropertyOptional({
    description: 'Array of tags for categorizing the thread',
    type: [String],
    example: ['support', 'urgent', 'billing']
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Thread priority level from 1 to 5',
    example: 3
  })
  priority?: number;

  @ApiPropertyOptional({
    description: 'Timestamp of last message in thread',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time'
  })
  lastMessageAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when thread was closed',
    example: '2024-01-15T11:00:00.000Z',
    format: 'date-time'
  })
  closedAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when thread was archived',
    example: '2024-01-15T12:00:00.000Z',
    format: 'date-time'
  })
  archivedAt?: Date;

  @ApiPropertyOptional({
    description: 'Feed post ID for comment threads',
    example: 'post-123'
  })
  feedPostId?: string;

  @ApiPropertyOptional({
    description: 'Parent comment ID for nested threads',
    example: 'comment-456'
  })
  parentCommentId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'website', campaign: 'summer2024' }
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Thread creation timestamp',
    example: '2024-01-15T10:00:00.000Z',
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Thread last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time'
  })
  updatedAt: Date;
}

export class ThreadListResponseDto {
  @ApiProperty({
    description: 'Array of threads',
    type: [ThreadResponseDto]
  })
  threads: ThreadResponseDto[];

  @ApiProperty({
    description: 'Total number of threads matching the query',
    example: 25
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 2
  })
  totalPages: number;
}
