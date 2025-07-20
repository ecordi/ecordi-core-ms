import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAccessDto {
  @ApiProperty({
    description: 'Token JWT de autenticación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
  @ApiProperty({
    description: 'ID del usuario (opcional si se proporciona token)',
    example: '60d5ec9af682fbd12a0b4d8e',
    required: false
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'ID de la compañía',
    example: '60d5ec9af682fbd12a0b4d8f',
  })
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @ApiProperty({
    description: 'Recurso a verificar',
    example: 'orders',
  })
  @IsNotEmpty()
  @IsString()
  resource: string;

  @ApiProperty({
    description: 'Acción a verificar',
    example: 'create',
  })
  @IsNotEmpty()
  @IsString()
  action: string;

  @ApiProperty({
    description: 'Nivel mínimo requerido (opcional)',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  requiredLevel?: string;
}
