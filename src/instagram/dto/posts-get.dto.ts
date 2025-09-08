import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PostsGetDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Metrics string for posts', example: 'engagement,impressions,reach' })
  @IsString()
  @IsNotEmpty()
  metrics: string;

  @ApiPropertyOptional({ description: 'Since UNIX timestamp', example: '1704067200' })
  @IsOptional()
  @IsString()
  since?: string;

  @ApiPropertyOptional({ description: 'Until UNIX timestamp', example: '1706745600' })
  @IsOptional()
  @IsString()
  until?: string;

  @ApiPropertyOptional({ description: 'Next cursor', example: 'QVFIUmtq...' })
  @IsOptional()
  @IsString()
  next?: string;
}
