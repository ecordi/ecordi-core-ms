import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InsightsMediaDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Post id to get insights', example: '17912345678901234' })
  @IsString()
  @IsNotEmpty()
  postId: string;
}
