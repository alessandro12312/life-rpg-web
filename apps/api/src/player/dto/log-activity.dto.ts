import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class LogActivityDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['STUDY', 'WORKOUT', 'MIXED', 'CUSTOM'])
  category: 'STUDY' | 'WORKOUT' | 'MIXED' | 'CUSTOM';

  @IsString()
  @IsNotEmpty()
  custom_name: string;

  @IsNumber()
  @Min(1, { message: 'La durata minima è di 1 minuto' })
  @Max(480, {
    message:
      'Non puoi registrare più di 8 ore (480 min) in una sola sessione per evitare abusi',
  })
  duration_minutes: number;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    'intelligence',
    'strength',
    'endurance',
    'discipline',
    'focus',
    'knowledge',
    'health',
  ])
  stat_type:
    | 'intelligence'
    | 'strength'
    | 'endurance'
    | 'discipline'
    | 'focus'
    | 'knowledge'
    | 'health';

  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  intensity_multiplier: number;
}
