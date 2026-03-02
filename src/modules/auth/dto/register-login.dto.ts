import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsPhoneNumber, IsString, MinLength, ValidateIf } from "class-validator";

export class RegisterLoginDto {
    @ApiPropertyOptional({ example: 'john.doe@example.com' })
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ example: '+905321234567' })
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone: string;

    @ApiProperty({ example: 'Secret@123' })
    @IsString()
    @MinLength(6)
    password: string;

}