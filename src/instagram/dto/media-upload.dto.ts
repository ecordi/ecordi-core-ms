import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class MediaUploadDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Type of media', enum: ['image', 'video', 'reel'] })
  @IsString()
  @IsIn(['image', 'video', 'reel'])
  type: 'image' | 'video' | 'reel';

  @ApiProperty({ description: 'Public URL of the media', example: 'https://files.example.com/file.jpg' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ description: 'Cover image URL (only for reel)', example: 'https://files.example.com/cover.jpg' })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({ description: 'Caption', example: 'Mi nuevo post' })
  @IsOptional()
  @IsString()
  caption?: string;
}
