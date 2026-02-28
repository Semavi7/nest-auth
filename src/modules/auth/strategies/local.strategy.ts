import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { RegisterLoginDto } from "../dto/register-login.dto";

@Injectable()
export class LocalStrategy extends PassportStrategy( Strategy ) {
    constructor( private authService: AuthService ) {
        super( { usernameField: "email" } );
    }

    async validate( dto: RegisterLoginDto ): Promise<any> {
        const user = await this.authService.validateUser( dto );
        if (!user) throw new UnauthorizedException('Email veya şifre hatalı');
        return user;
    }
}