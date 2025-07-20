import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveUserContextDto {
  @ApiProperty({
    description: 'Token JWT (opcional si se proporciona userId)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({
    description: 'ID del usuario (opcional si se proporciona token)',
    example: '60d5ec9af682fbd12a0b4d8e',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'ID de la compañía (opcional)',
    example: '60d5ec9af682fbd12a0b4d8f',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}
