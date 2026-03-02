import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsPhoneNumber, ValidateIf } from "class-validator";

export class ResendOtpDto {
    @ApiPropertyOptional({ example: 'john.doe@example.com' })
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: '+905321234567' })
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone?: string;
}