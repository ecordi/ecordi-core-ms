import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckVideoUploadDto {
  @ApiProperty({ description: 'Instagram channel connection id', example: 'conn_ig_123' })
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({ description: 'Creation id to check status', example: '17898765432109876' })
  @IsString()
  @IsNotEmpty()
  creationId: string;
}
