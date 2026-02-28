import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsPhoneNumber, IsString, MinLength, ValidateIf } from "class-validator";

export class RegisterLoginDto {
    @ApiPropertyOptional()
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email: string;

    @ApiPropertyOptional()
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    password: string;

}