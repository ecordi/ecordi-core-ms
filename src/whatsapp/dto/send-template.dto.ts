import { IsNotEmpty, IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TemplateLanguageDto {
  @ApiProperty({
    description: 'Language code for the template (ISO 639-1 format)',
    example: 'en_US',
    pattern: '^[a-z]{2}_[A-Z]{2}$'
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class SendTemplateDto {
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
    description: 'WhatsApp Business template name (must be approved by Meta)',
    example: 'welcome_message',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Template language configuration',
    type: TemplateLanguageDto
  })
  @ValidateNested()
  @Type(() => TemplateLanguageDto)
  language!: TemplateLanguageDto;

  @ApiPropertyOptional({
    description: 'Template components (header, body, footer, buttons) with parameters',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'body' },
        parameters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'text' },
              text: { type: 'string', example: 'John Doe' }
            }
          }
        }
      }
    },
    example: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'John Doe' },
          { type: 'text', text: '12345' }
        ]
      }
    ]
  })
  @IsOptional()
  @IsArray()
  components?: any[];
}
