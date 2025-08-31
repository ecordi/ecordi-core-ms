import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitConnectionDto {
  @ApiProperty({ 
    description: 'Company identifier',
    example: 'comp_001'
  })
  @IsString()
  @IsNotEmpty()
  companyId: string;
}
