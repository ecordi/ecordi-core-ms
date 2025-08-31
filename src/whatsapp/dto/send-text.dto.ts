import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTextDto {
  @ApiProperty({
    description: 'Company ID that owns the WhatsApp connection',
    example: 'company-123',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiPropertyOptional({
    description: 'Connection ID for the WhatsApp channel',
    example: 'conn-456',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  connectionId?: string;

  @ApiPropertyOptional({
    description: 'Connection reference ID (alternative identifier)',
    example: 'ref-789',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  connectionRefId?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp Phone Number ID from Meta Business API',
    example: '1234567890123456',
    maxLength: 50
  })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiProperty({
    description: 'Recipient phone number in international format',
    example: '5493515551234',
    minLength: 8,
    maxLength: 15
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: 'Text message content to send',
    example: 'Hello! How can I help you today?',
    minLength: 1,
    maxLength: 4096
  })
  @IsString()
  @IsNotEmpty()
  text!: string;
}

  