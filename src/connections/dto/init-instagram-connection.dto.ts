import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitInstagramConnectionDto {
  @ApiProperty({
    description: 'Company identifier to bind the Instagram connection to',
    example: 'company_123',
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
