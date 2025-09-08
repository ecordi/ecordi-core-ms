import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FacebookAttachmentPayloadDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  url!: string;
}

class FacebookAttachmentDto {
  @ApiProperty({ enum: ['image', 'video', 'audio', 'file', 'template'] })
  @IsString()
  type!: string;

  @ApiProperty({ type: FacebookAttachmentPayloadDto })
  @ValidateNested()
  @Type(() => FacebookAttachmentPayloadDto)
  payload!: FacebookAttachmentPayloadDto;
}

export class FacebookMessageDto {
  @ApiProperty({ description: 'Plain text', required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ description: 'Attachment', required: false, type: FacebookAttachmentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FacebookAttachmentDto)
  attachment?: FacebookAttachmentDto;
}

export class SendFacebookMessageDto {
  @ApiProperty({ description: 'Page connectionId (sender)', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  senderId!: string;

  @ApiProperty({ description: 'Recipient user id', example: '987654321' })
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @ApiProperty({ type: [FacebookMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FacebookMessageDto)
  messages!: FacebookMessageDto[];
}
