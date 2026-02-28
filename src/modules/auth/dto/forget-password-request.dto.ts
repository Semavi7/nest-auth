import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsPhoneNumber, ValidateIf } from "class-validator";
import { VerifyChannel } from "../enums/auth.verify-channel.enum";

export class ForgetPasswordRequestDto {
    @ApiPropertyOptional()
    @ValidateIf(o => !o.phone)
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @ValidateIf(o => !o.email)
    @IsPhoneNumber()
    phone?: string;

    @ApiProperty({ enum: VerifyChannel })
    @IsEnum(VerifyChannel)
    channel: VerifyChannel;
}