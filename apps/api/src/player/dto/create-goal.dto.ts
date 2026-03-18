import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateGoalDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsNumber()
    @Min(1)
    @Max(10000)
    target_minutes: number;

    @IsOptional()
    @IsString()
    deadline?: string;

    @IsOptional()
    @IsNumber()
    @Min(10)
    @Max(5000)
    xp_reward?: number;
}
