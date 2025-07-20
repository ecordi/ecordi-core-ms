import { ApiProperty } from '@nestjs/swagger';

export class CheckAccessResponseDto {
  @ApiProperty({ example: true })
  hasAccess: boolean;

  @ApiProperty({ example: 'user123' })
  userId: string;
  
  @ApiProperty({ example: 50 })
  level: number;

  @ApiProperty({ example: 'User has access to create orders', required: false })
  message?: string;
}
