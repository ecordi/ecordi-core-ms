import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CommentReplyDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Comment id to reply', example: '17998765432109876' })
  @IsString()
  @IsNotEmpty()
  commentId: string;

  @ApiProperty({ description: 'Reply text', example: '¡Gracias!' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
