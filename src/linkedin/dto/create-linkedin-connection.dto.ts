import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class WebhookDto {
  @ApiProperty({ description: 'Webhook type' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Webhook action' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Webhook parameters' })
  @IsOptional()
  params?: {
    headers?: Record<string, any>;
  };
}

export class CreateLinkedInConnectionDto {
  @ApiProperty({ description: 'OAuth authorization code from LinkedIn' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'OAuth redirect URL' })
  @IsString()
  redirectUrl: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiPropertyOptional({ description: 'Webhook configurations', type: [WebhookDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookDto)
  webhooks?: WebhookDto[];
}
