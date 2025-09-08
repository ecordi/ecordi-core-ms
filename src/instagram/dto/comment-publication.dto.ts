import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CommentPublicationDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Target post id to comment', example: '17912345678901234' })
  @IsString()
  @IsNotEmpty()
  postId: string;

  @ApiProperty({ description: 'Comment text', example: 'Excelente post!' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
