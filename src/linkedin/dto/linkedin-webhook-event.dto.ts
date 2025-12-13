import { IsString, IsObject, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkedInWebhookEventDto {
  @ApiProperty({ description: 'Event type from LinkedIn' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Connection ID' })
  @IsString()
  connectionId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'LinkedIn notifications array' })
  @IsArray()
  notifications: Array<Record<string, any>>;

  @ApiPropertyOptional({ description: 'Additional event metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
