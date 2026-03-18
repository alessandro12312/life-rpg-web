import { IsNumber, Min, Max } from 'class-validator';

export class OnboardPlayerDto {
    @IsNumber()
    @Min(0)
    @Max(168) // Max hours in a week
    studyHoursWeekly: number;

    @IsNumber()
    @Min(0)
    @Max(168)
    workoutHoursWeekly: number;
}
