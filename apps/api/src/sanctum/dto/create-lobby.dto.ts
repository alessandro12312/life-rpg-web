import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class CreateLobbyDto {
    @IsString()
    title: string;

    @IsString()
    category: string;

    @IsNumber()
    @Min(1)
    @Max(8)
    maxParticipants: number;

    @IsBoolean()
    isPrivate: boolean;

    @IsString()
    @IsOptional()
    password?: string;

    @IsNumber()
    @Min(1)
    @Max(60)
    focusDuration: number;

    @IsNumber()
    @Min(1)
    @Max(30)
    breakDuration: number;
}
