import { IsString, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'Company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Phone number in international format' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ description: 'WhatsApp display name' })
  @IsOptional()
  @IsString()
  whatsappName?: string;

  @ApiPropertyOptional({ description: 'Notes about the contact' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Contact metadata' })
  @IsOptional()
  metadata?: {
    lastSeen?: Date;
    isWhatsAppUser?: boolean;
    businessAccount?: boolean;
    tags?: string[];
  };
}

export class UpdateContactDto {
  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ description: 'WhatsApp display name' })
  @IsOptional()
  @IsString()
  whatsappName?: string;

  @ApiPropertyOptional({ description: 'Notes about the contact' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Contact status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Contact metadata' })
  @IsOptional()
  metadata?: {
    lastSeen?: Date;
    isWhatsAppUser?: boolean;
    businessAccount?: boolean;
    tags?: string[];
  };
}

export class ContactResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  companyId: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  profilePicture?: string;

  @ApiPropertyOptional()
  whatsappName?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  metadata?: {
    lastSeen?: Date;
    isWhatsAppUser?: boolean;
    businessAccount?: boolean;
    tags?: string[];
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
