import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MentionReplyDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Message content to reply in a mention', example: '¡Gracias por mencionarnos!' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Media id of the mention context', example: '17912345678901234' })
  @IsString()
  @IsNotEmpty()
  media_id: string;

  @ApiProperty({ description: 'Comment id (if replying to a mentioned comment)', example: '17998765432109876' })
  @IsString()
  @IsNotEmpty()
  comment_id: string;
}
