import { IsString, IsOptional, IsEnum } from 'class-validator';

export class StartBattleDto {
  @IsString()
  boss_id: string;

  @IsOptional()
  @IsEnum(['SOLO', 'PARTY', 'RAID'], {
    message: 'mode deve essere SOLO, PARTY o RAID',
  })
  mode?: string;
}
