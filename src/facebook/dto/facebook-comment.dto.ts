import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FacebookTargetDto {
  @ApiProperty({ enum: ['post', 'comment'] })
  @IsIn(['post', 'comment'])
  type!: 'post' | 'comment';

  @ApiProperty({ description: 'Target id (postId or commentId)' })
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class FacebookCommentDto {
  @ApiProperty({ description: 'Page connectionId', example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  senderId!: string;

  @ApiProperty({ type: FacebookTargetDto })
  @ValidateNested()
  @Type(() => FacebookTargetDto)
  target!: FacebookTargetDto;

  @ApiPropertyOptional({ description: 'Comment text' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Attachment image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ enum: ['create', 'update', 'delete'], default: 'create' })
  @IsOptional()
  @IsIn(['create', 'update', 'delete'])
  action?: 'create' | 'update' | 'delete';

  @ApiPropertyOptional({ description: 'CommentId for update/delete' })
  @IsOptional()
  @IsString()
  commentId?: string;
}
