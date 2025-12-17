import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessageDirection, MessageStatus } from '../schemas/message.schema';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Unique message identifier',
    example: 'msg-123'
  })
  messageId: string;

  @ApiProperty({
    description: 'Thread ID this message belongs to',
    example: 'thread-789'
  })
  threadId: string;

  @ApiProperty({
    description: 'Company ID that owns this message',
    example: 'company-123'
  })
  companyId: string;

  @ApiProperty({
    enum: MessageDirection,
    description: 'Message direction',
    example: MessageDirection.OUTBOUND,
    enumName: 'MessageDirection'
  })
  direction: MessageDirection;

  @ApiProperty({
    enum: MessageType,
    description: 'Type of message content',
    example: MessageType.TEXT,
    enumName: 'MessageType'
  })
  type: MessageType;

  @ApiProperty({
    enum: MessageStatus,
    description: 'Current message status',
    example: MessageStatus.DELIVERED,
    enumName: 'MessageStatus'
  })
  status: MessageStatus;

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
    description: 'Sender identifier',
    example: '5493515551234'
  })
  fromId: string;

  @ApiProperty({
    description: 'Recipient identifier',
    example: 'business-phone'
  })
  toId: string;

  @ApiPropertyOptional({
    description: 'Display name of the sender',
    example: 'John Doe'
  })
  fromName?: string;

  @ApiPropertyOptional({
    description: 'Display name of the recipient',
    example: 'Support Team'
  })
  toName?: string;

  @ApiPropertyOptional({
    description: 'Text content of the message',
    example: 'Hello! How can I help you today?'
  })
  text?: string;

  @ApiPropertyOptional({
    description: 'URL to media file',
    example: 'https://example.com/media/image.jpg'
  })
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'MIME type of the media file',
    example: 'image/jpeg'
  })
  mediaType?: string;

  @ApiPropertyOptional({
    description: 'Caption text for media messages',
    example: 'Product catalog image'
  })
  mediaCaption?: string;

  @ApiPropertyOptional({
    description: 'Original filename for documents',
    example: 'invoice_2024.pdf'
  })
  fileName?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 1048576
  })
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'External message ID from channel provider',
    example: 'wamid.abc123def456'
  })
  externalMessageId?: string;

  @ApiPropertyOptional({
    description: 'ID of message being replied to',
    example: 'msg-456'
  })
  replyToMessageId?: string;

  @ApiPropertyOptional({
    description: 'Template name for template messages',
    example: 'welcome_message'
  })
  templateName?: string;

  @ApiPropertyOptional({
    description: 'Template language code',
    example: 'en'
  })
  templateLanguage?: string;

  @ApiPropertyOptional({
    description: 'Template parameters',
    example: { name: 'John', company: 'Acme Corp' }
  })
  templateParameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Interactive message data',
    example: { type: 'button', buttons: [{ id: '1', title: 'Yes' }] }
  })
  interactiveData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Location latitude coordinate',
    example: -31.4201
  })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Location longitude coordinate',
    example: -64.1888
  })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Location name',
    example: 'Córdoba, Argentina'
  })
  locationName?: string;

  @ApiPropertyOptional({
    description: 'Location address',
    example: 'Córdoba, Córdoba Province, Argentina'
  })
  locationAddress?: string;

  @ApiPropertyOptional({
    description: 'Contact information data',
    example: { name: 'John Doe', phone: '+5493515551234' }
  })
  contactData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Timestamp when message was sent',
    example: '2024-01-15T10:31:00.000Z',
    format: 'date-time'
  })
  sentAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when message was delivered',
    example: '2024-01-15T10:32:00.000Z',
    format: 'date-time'
  })
  deliveredAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when message was read',
    example: '2024-01-15T10:35:00.000Z',
    format: 'date-time'
  })
  readAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when message failed',
    example: '2024-01-15T10:31:30.000Z',
    format: 'date-time'
  })
  failedAt?: Date;

  @ApiPropertyOptional({
    description: 'Error message if delivery failed',
    example: 'Invalid phone number format'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'website', campaign: 'summer2024' }
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Message last update timestamp',
    example: '2024-01-15T10:32:00.000Z',
    format: 'date-time'
  })
  updatedAt: Date;
}

export class MessageListResponseDto {
  @ApiProperty({
    description: 'Array of messages',
    type: [MessageResponseDto]
  })
  messages: MessageResponseDto[];

  @ApiProperty({
    description: 'Total number of messages matching the query',
    example: 150
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3
  })
  totalPages: number;
}

export class MessageStatsResponseDto {
  @ApiProperty({
    description: 'Total number of messages in the period',
    example: 150
  })
  total: number;

  @ApiProperty({
    description: 'Breakdown by direction, status, and channel',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        direction: { type: 'string', example: 'inbound' },
        status: { type: 'string', example: 'delivered' },
        channelType: { type: 'string', example: 'whatsapp_cloud' },
        count: { type: 'number', example: 75 }
      }
    },
    example: [
      {
        direction: 'inbound',
        status: 'delivered',
        channelType: 'whatsapp_cloud',
        count: 75
      },
      {
        direction: 'outbound',
        status: 'sent',
        channelType: 'whatsapp_cloud',
        count: 70
      }
    ]
  })
  byDirection: Array<{
    direction: string;
    status: string;
    channelType: string;
    count: number;
  }>;
}
