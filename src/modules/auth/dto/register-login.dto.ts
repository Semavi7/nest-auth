import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength, ValidateIf } from "class-validator";
import { DeviceType } from "../enums/auth.device-type.enum";

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

    @ApiPropertyOptional({ example: 'web', enum: DeviceType })
    @IsOptional()
    @IsEnum(DeviceType)
    device_type?: DeviceType;

    @ApiPropertyOptional({ example: 'Chrome / Windows' })
    @IsOptional()
    @IsString()
    device_name?: string;

    @ApiPropertyOptional({ example: 'uuid-from-client-storage' })
    @IsOptional()
    @IsString()
    device_id?: string;

}