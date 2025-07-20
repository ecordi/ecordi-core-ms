import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveModulesDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: '60d5ec9af682fbd12a0b4d8e',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'ID de la compañía',
    example: '60d5ec9af682fbd12a0b4d8f',
  })
  @IsNotEmpty()
  @IsString()
  companyId: string;
  
  @ApiProperty({
    description: 'Token JWT de autenticación (opcional)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false
  })
  @IsOptional()
  @IsString()
  token?: string;
}
