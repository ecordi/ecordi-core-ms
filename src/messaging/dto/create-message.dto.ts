import { IsString, IsEnum, IsOptional, IsNumber, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessageDirection } from '../schemas/message.schema';

export class CreateMessageDto {
  @ApiProperty({ 
    description: 'Thread ID that this message belongs to',
    example: 'thread-789',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  threadId: string;

  @ApiProperty({ 
    description: 'Company ID that owns this message',
    example: 'company-123',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  companyId: string;

  @ApiProperty({ 
    enum: MessageDirection, 
    description: 'Message direction - inbound from external user, outbound to external user',
    example: MessageDirection.OUTBOUND,
    enumName: 'MessageDirection'
  })
  @IsEnum(MessageDirection)
  direction: MessageDirection;

  @ApiProperty({ 
    enum: MessageType, 
    description: 'Type of message content (text, image, audio, video, document, location, contact, template, interactive, system)',
    example: MessageType.TEXT,
    enumName: 'MessageType'
  })
  @IsEnum(MessageType)
  type: MessageType;

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
    description: 'Sender identifier (phone number, email, user ID, etc.)',
    example: '5493515551234',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  fromId: string;

  @ApiProperty({ 
    description: 'Recipient identifier (phone number, email, user ID, etc.)',
    example: 'business-phone',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  toId: string;

  @ApiPropertyOptional({ 
    description: 'Display name of the sender',
    example: 'John Doe',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  fromName?: string;

  @ApiPropertyOptional({ 
    description: 'Display name of the recipient',
    example: 'Support Team',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  toName?: string;

  @ApiPropertyOptional({ 
    description: 'Text content of the message (required for text messages)',
    example: 'Hello! How can I help you today?',
    maxLength: 4096
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ 
    description: 'URL to media file (image, video, audio, document)',
    example: 'https://example.com/media/image.jpg',
    format: 'uri'
  })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ 
    description: 'MIME type of the media file',
    example: 'image/jpeg',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({ 
    description: 'Caption text for media messages',
    example: 'Product catalog image',
    maxLength: 1024
  })
  @IsOptional()
  @IsString()
  mediaCaption?: string;

  @ApiPropertyOptional({ 
    description: 'Original filename for document messages',
    example: 'invoice_2024.pdf',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ 
    description: 'File size in bytes for media/document messages',
    example: 1048576,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ 
    description: 'External message ID from the channel provider (WhatsApp message ID, etc.)',
    example: 'wamid.abc123def456',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  externalMessageId?: string;

  @ApiPropertyOptional({ 
    description: 'ID of the message this is replying to (for threaded conversations)',
    example: 'msg-456',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @ApiPropertyOptional({ 
    description: 'Template name for template messages (WhatsApp Business templates)',
    example: 'welcome_message',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional({ 
    description: 'Template language code (ISO 639-1)',
    example: 'en',
    minLength: 2,
    maxLength: 10
  })
  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @ApiPropertyOptional({ 
    description: 'Parameters for template messages as key-value pairs',
    example: { name: 'John', company: 'Acme Corp' },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  templateParameters?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Interactive message data (buttons, lists, etc.)',
    example: { type: 'button', buttons: [{ id: '1', title: 'Yes' }] },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  interactiveData?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Location latitude coordinate (for location messages)',
    example: -31.4201,
    minimum: -90,
    maximum: 90
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ 
    description: 'Location longitude coordinate (for location messages)',
    example: -64.1888,
    minimum: -180,
    maximum: 180
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ 
    description: 'Location name or title (for location messages)',
    example: 'Córdoba, Argentina',
    maxLength: 200
  })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({ 
    description: 'Full address of the location (for location messages)',
    example: 'Córdoba, Córdoba Province, Argentina',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({ 
    description: 'Contact information data (for contact messages)',
    example: { name: 'John Doe', phone: '+5493515551234', email: 'john@example.com' },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  contactData?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Additional metadata as key-value pairs',
    example: { source: 'website', campaign: 'summer2024' },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Raw payload from channel provider (for debugging and audit)',
    example: { whatsapp_message_id: 'wamid.abc123' },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, any>;
}
