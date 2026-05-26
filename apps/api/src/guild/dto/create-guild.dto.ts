import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateGuildDto {
  @IsString()
  @MinLength(3, {
    message: 'Il nome della gilda deve avere almeno 3 caratteri',
  })
  @MaxLength(50, {
    message: 'Il nome della gilda non può superare i 50 caratteri',
  })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, {
    message: 'La descrizione non può superare i 200 caratteri',
  })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Il motto non può superare i 100 caratteri' })
  motto?: string;
}
