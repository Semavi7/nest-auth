import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsPhoneNumber, ValidateIf } from "class-validator";

export class ResendOtpDto {
    @ApiPropertyOptional()
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone?: string;
}