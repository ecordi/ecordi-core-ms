import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PublicationPutDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Post id to update', example: '17912345678901234' })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiPropertyOptional({ description: 'New message', example: 'Actualización del post' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Link to include', example: 'https://example.com' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: 'Place id to include', example: '1234567890' })
  @IsOptional()
  @IsString()
  place?: string;
}
