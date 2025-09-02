import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsIn, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class MediaItemDto {
  @ApiProperty({ description: 'Media ID from provider' })
  @IsString()
  mediaId: string;

  @ApiProperty({ description: 'MIME type of the media' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'Original filename', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({ description: 'Media caption', required: false })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ description: 'SHA256 hash', required: false })
  @IsOptional()
  @IsString()
  sha256?: string;

  @ApiProperty({ description: 'File size in bytes', required: false })
  @IsOptional()
  @IsNumber()
  size?: number;
}

export class ChannelEventDto {
  @ApiProperty({ description: 'Channel name (whatsapp, facebook, etc.)' })
  @IsString()
  channel: string;

  @ApiProperty({ description: 'Message direction', enum: ['incoming', 'outgoing'] })
  @IsIn(['incoming', 'outgoing'])
  direction: 'incoming' | 'outgoing';

  @ApiProperty({ description: 'Company ID for multi-tenancy' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Connection ID from channel' })
  @IsString()
  connectionId: string;

  @ApiProperty({ description: 'Sender ID (phone number, user ID, etc.)' })
  @IsString()
  senderId: string;

  @ApiProperty({ description: 'Recipient ID (phone number, page ID, etc.)' })
  @IsString()
  recipientId: string;

  @ApiProperty({ description: 'Remote message ID from provider' })
  @IsString()
  remoteId: string;

  @ApiProperty({ description: 'Message timestamp (Unix timestamp in milliseconds)' })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: 'Message type', enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'template', 'interactive', 'location', 'contacts'] })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Message body/text content', required: false })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiProperty({ description: 'Media attachments', type: [MediaItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaItemDto)
  media?: MediaItemDto[];

  @ApiProperty({ description: 'Location data', required: false })
  @IsOptional()
  @IsObject()
  location?: any;

  @ApiProperty({ description: 'Contact data', required: false })
  @IsOptional()
  @IsObject()
  contacts?: any;

  @ApiProperty({ description: 'Interactive message data', required: false })
  @IsOptional()
  @IsObject()
  interactive?: any;

  @ApiProperty({ description: 'Template message data', required: false })
  @IsOptional()
  @IsObject()
  template?: any;

  @ApiProperty({ description: 'Raw provider payload', required: false })
  @IsOptional()
  @IsObject()
  providerRaw?: any;
}
