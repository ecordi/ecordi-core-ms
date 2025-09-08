import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WebhookHeaderDto {
  @ApiProperty({ example: 'X-Api-Key' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'secret' })
  @IsString()
  value!: string;
}

class WebhookParamsDto {
  @ApiPropertyOptional({ type: [WebhookHeaderDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WebhookHeaderDto)
  headers?: WebhookHeaderDto[];
}

class WebhookConfigDto {
  @ApiProperty({ enum: ['httpRequest'], example: 'httpRequest' })
  @IsString()
  type!: 'httpRequest';

  @ApiProperty({ example: 'https://core-ms.internal/webhooks/facebook' })
  @IsString()
  action!: string;

  @ApiPropertyOptional({ type: WebhookParamsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookParamsDto)
  params?: WebhookParamsDto;
}

export class FacebookRegisterDto {
  @ApiProperty({ description: 'Facebook user id (owner of pages)', example: '1000123456789' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ description: 'Short-lived user token from Facebook Login' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiPropertyOptional({ type: [WebhookConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookConfigDto)
  webhooks?: WebhookConfigDto[];
}
