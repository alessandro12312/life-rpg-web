import { IsNumber, Min, Max, IsString, IsOptional } from 'class-validator';

export class OnboardPlayerDto {
    @IsNumber()
    @Min(0)
    @Max(168) // Max hours in a week
    studyHoursWeekly: number;

    @IsNumber()
    @Min(0)
    @Max(168)
    workoutHoursWeekly: number;

    @IsString()
    race: string;

    @IsString()
    className: string;

    @IsString()
    @IsOptional()
    avatarId?: string;
}
