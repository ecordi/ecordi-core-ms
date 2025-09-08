import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FacebookPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  place?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  targeting?: Record<string, any>;
}

class FacebookMediaDto {
  @ApiPropertyOptional({ enum: ['photo', 'video'] })
  @IsOptional()
  @IsIn(['photo', 'video'])
  type?: 'photo' | 'video';

  @ApiPropertyOptional({ description: 'Single photo URL' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ description: 'Array of uploaded photo IDs' })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsString()
  pathVideo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class FacebookFeedDto {
  @ApiProperty({ description: 'Page connectionId', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  senderId!: string;

  @ApiPropertyOptional({ type: FacebookPostDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FacebookPostDto)
  post?: FacebookPostDto;

  @ApiPropertyOptional({ type: FacebookMediaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FacebookMediaDto)
  media?: FacebookMediaDto;

  @ApiPropertyOptional({ description: 'PostId for update/delete' })
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional({ enum: ['create', 'update', 'delete'], default: 'create' })
  @IsOptional()
  @IsIn(['create', 'update', 'delete'])
  action?: 'create' | 'update' | 'delete';
}
