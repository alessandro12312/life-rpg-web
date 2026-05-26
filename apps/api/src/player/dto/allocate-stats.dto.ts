import { IsString, IsNotEmpty, IsInt, Min, IsIn } from 'class-validator';

export class AllocateStatsDto {
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
  stat:
    | 'intelligence'
    | 'strength'
    | 'endurance'
    | 'discipline'
    | 'focus'
    | 'knowledge'
    | 'health';

  @IsInt()
  @Min(1)
  points: number;
}
