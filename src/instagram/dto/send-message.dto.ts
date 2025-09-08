import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentPayloadDto {
  @ApiProperty({ description: 'Public URL of the media/file', example: 'https://files.example.com/image.png' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

class AttachmentDto {
  @ApiProperty({ description: 'Attachment type', example: 'image', enum: ['image', 'audio', 'video', 'file'] })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: 'Attachment payload' })
  @ValidateNested()
  @Type(() => AttachmentPayloadDto)
  payload: AttachmentPayloadDto;
}

class MessageItemDto {
  @ApiPropertyOptional({ description: 'Text message object', example: { text: 'Hola!' } })
  @IsOptional()
  @IsObject()
  text?: any;

  @ApiPropertyOptional({ description: 'Attachment message', type: AttachmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttachmentDto)
  attachment?: AttachmentDto;
}

export class SendInstagramMessageDto {
  @ApiProperty({ description: 'Connection/Channel identifier in the Instagram Channel MS (maps to InstagramUser.connectionId)', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Instagram recipient ID (PSID / IG user id)', example: '1234567890123456' })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ description: 'Messages to send (text and/or attachment items)', type: [MessageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageItemDto)
  messages: MessageItemDto[];

  @ApiPropertyOptional({ description: 'Optional correlation id for tracing', example: 'corr-123' })
  @IsOptional()
  @IsString()
  correlationId?: string;
}
