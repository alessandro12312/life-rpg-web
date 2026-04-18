import { IsString, IsOptional, IsInt, IsNumber, Min, Max, MaxLength, IsEnum } from 'class-validator';

export class CreateBossDto {
    @IsString()
    @MaxLength(100, { message: 'Il nome del boss non può superare i 100 caratteri' })
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsEnum(['GOAL', 'TRAINING', 'RAID'], { message: 'boss_type deve essere GOAL, TRAINING o RAID' })
    boss_type?: string;

    @IsInt()
    @Min(1)
    @Max(5)
    tier: number;

    @IsNumber()
    @Min(0.5)
    @Max(10.0)
    difficulty_factor: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(3)
    phase_count?: number;

    @IsOptional()
    @IsString()
    source_goal_id?: string;
}
