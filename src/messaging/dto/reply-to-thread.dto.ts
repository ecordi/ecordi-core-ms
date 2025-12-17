import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReplyToThreadDto {
  @ApiProperty({
    description: 'Company ID that owns this message',
    example: 'company-123',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  companyId: string;

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
    description: 'Sender identifier (business phone, email, etc.)',
    example: 'business-phone',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  fromId: string;

  @ApiProperty({
    description: 'Recipient identifier (customer phone, email, etc.)',
    example: '5493515551234',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  toId: string;

  @ApiPropertyOptional({
    description: 'Text content of the reply message',
    example: 'Thank you for contacting us. Let me help you with that.',
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
    example: 'Here is the information you requested',
    maxLength: 1024
  })
  @IsOptional()
  @IsString()
  mediaCaption?: string;

  @ApiPropertyOptional({
    description: 'Template name for template messages (WhatsApp Business templates)',
    example: 'customer_support_response',
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
    example: { customer_name: 'John', order_number: '12345' },
    type: 'object'
  })
  @IsOptional()
  @IsObject()
  templateParameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'ID of the message this is replying to (for threaded conversations)',
    example: 'msg-456',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  replyToMessageId?: string;
}
