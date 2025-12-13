import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LinkedInPostType {
  FEED = 'FEED',
  COMMENT = 'COMMENT'
}

export class CreateLinkedInPostDto {
  @ApiProperty({ description: 'Connection ID for LinkedIn' })
  @IsString()
  connectionId: string;

  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Post type', enum: LinkedInPostType })
  @IsEnum(LinkedInPostType)
  type: LinkedInPostType;

  @ApiProperty({ description: 'Post content text' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Media URL for image/video posts' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Media type (image, video, document)' })
  @IsOptional()
  @IsString()
  mediaType?: string;

  @ApiPropertyOptional({ description: 'Parent post ID for comments' })
  @IsOptional()
  @IsString()
  parentPostId?: string;

  @ApiPropertyOptional({ description: 'Scheduled publication date' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
