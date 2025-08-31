import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class StartConnectionDto {
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
