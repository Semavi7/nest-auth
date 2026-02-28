import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository, IsNull } from 'typeorm';
import { UserSession } from './entities/user-sessions.entity';
import { Verify } from './entities/verify.entity';
import { ForgetPassword } from './entities/forget_password.entity';
import { Socialite } from './entities/socialites.entity';
import { JwtService } from '@nestjs/jwt';
import { RegisterLoginDto } from './dto/register-login.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserStatus } from './enums/auth.user-status.enum';
import { VerifyChannel } from './enums/auth.verify-channel.enum';
import { VerifyType } from './enums/auth.verify-type.enum';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { VerifyStatus } from './enums/auth.verify-status.enum';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { DeviceType } from './enums/auth.device-type.enum';
import { SocialiteType } from './enums/auth.socialite-type.enum';
import { ForgetPasswordRequestDto } from './dto/forget-password-request.dto';
import { ResetPasswordDto } from './dto/reset.password.dto';


@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(UserSession) private sessionRepo: Repository<UserSession>,
        @InjectRepository(Verify) private verifyRepo: Repository<Verify>,
        @InjectRepository(ForgetPassword) private forgetPasswordRepo: Repository<ForgetPassword>,
        @InjectRepository(Socialite) private socialiteRepo: Repository<Socialite>,
        private jwtService: JwtService
    ){}

    async validateUser(dto: RegisterLoginDto): Promise<User> {
        const whereConditions : any[] = [];
        if(dto.email) whereConditions.push({ email: dto.email });
        if(dto.phone) whereConditions.push( { phone: dto.phone });

        const user = await this.userRepo.findOne({ where: whereConditions });

        if(!user || !user.password) throw new UnauthorizedException('Email veya şifre hatalı');

        if (user.status === UserStatus.PENDING) throw new UnauthorizedException('Lütfen giriş yapmadan önce hesabınızı doğrulayın.');
        

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if(!isMatch) throw new UnauthorizedException('Şifre hatalı');

        return user;
    }

    async register(dto: RegisterLoginDto, ip?: string, userAgent?: string): Promise<any> {
        const whereConditions : any[] = [];
        if(dto.email) whereConditions.push({ email: dto.email });
        if(dto.phone) whereConditions.push( { phone: dto.phone });

        const existingUser = await this.userRepo.findOne({ where: whereConditions });
        if(existingUser) throw new UnauthorizedException('Bu email veya telefon zaten kayıtlı');

        const user = this.userRepo.create({
            email: dto.email || null,
            phone: dto.phone || null,
            password: await bcrypt.hash(dto.password, 10),
            first_name: null,
            last_name: null,
            status: UserStatus.PENDING,
            phone_verify_id: '00000000-0000-0000-0000-000000000000',
            email_verify_id: '0'
        });

        await this.userRepo.save(user);

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const channel = dto.email ? VerifyChannel.EMAIL : VerifyChannel.SMS;

        const verify = this.verifyRepo.create({
            channel: channel,
            type: VerifyType.VERIFY_ACCOUNT,
            user_id: user.id,
            code: otpCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            ip_address: ip || 'unknown',
            user_agent: userAgent || 'unknown'
        });

        await this.verifyRepo.save(verify);
        //TODO: SMS veya Email gönderme işlemi yapılacak
        console.log(`[HESAP DOĞRULAMA] Hedef: ${dto.email || dto.phone} | Kod: ${otpCode} | IP: ${ip}`);  

        return { 
            message: 'Kayıt başarılı. Lütfen gönderilen kod ile hesabınızı doğrulayın.',
            user: user 
        };
    }

    async login(user: User, ip?: string, userAgent?: string): Promise<any> {
        const payload = { sub: user.id, email: user.email, phone: user.phone };
        const token = this.jwtService.sign(payload);

        await this.sessionRepo.save(this.sessionRepo.create({
            user_id: user.id,
            refresh_token_Hash: await bcrypt.hash(uuidv4(), 10),
            device_id: uuidv4(),
            device_type: DeviceType.WEB,
            ip_address: ip,
            user_agent: userAgent,
            last_active_at: new Date(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }));

        return { access_token: token, user: user };
    }

    async validateOAuthLogin(profile: any, provider: SocialiteType): Promise<any> {
        const { id, emails, displayNmae, photos, _raw } = profile;
        const email = emails && emails.length > 0 ? emails[0].value : null;

        let socialite = await this.socialiteRepo.findOne({ where: { type: provider, ref_id: id }, relations: ['user'] });
        if (socialite) return socialite.user;

        let user = email ? await this.userRepo.findOne({ where: { email: email } }) : null;

        if (!user) {
            user = await this.userRepo.save(this.userRepo.create({
                email: email || `${id}@${provider}.local`,
                first_name: displayNmae.split(' ')[0],
                last_name: displayNmae.split(' ').slice(1).join(' ') || '',
                status: UserStatus.ACTIVE,
                phone_verify_id: '00000000-0000-0000-0000-000000000000',
                email_verify_id: '0',
                password: null
            }));
        }

        await this.socialiteRepo.save(this.socialiteRepo.create({
            type: provider,
            ref_id: id,
            email: email,
            user_id: user.id,
            data: { avatar: photos?.[0]?.value, raw_profile: JSON.parse(_raw || '{}') }
        }));

        return user;
    }

    async forgetPassword(dto: ForgetPasswordRequestDto, ip?: string, userAgent?: string): Promise<any> {
        const whereConditions : any[] = [];
        if(dto.email) whereConditions.push({ email: dto.email });
        if(dto.phone) whereConditions.push( { phone: dto.phone });

        const user = await this.userRepo.findOne({ where: whereConditions });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
        
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const expireDate = new Date(Date.now() + 15 * 60 * 1000);

        const verify = await this.verifyRepo.save(this.verifyRepo.create({
            channel: dto.channel,
            type: VerifyType.FORGET_PASSWORD,
            user_id: user.id,
            code: otpCode,
            expires_at: expireDate,
            ip_address: ip,
            user_agent: userAgent
        }));

        await this.forgetPasswordRepo.save(this.forgetPasswordRepo.create({
            user_id: user.id,
            expires_at: expireDate,
            verify_id: verify.id
        }));

        //TODO: SMS veya Email gönderme işlemi yapılacak
        console.log(`[ŞİFRE SIFIRLAMA KODU] Hedef: ${dto.email || dto.phone}, Kod: ${otpCode}`);

        return { message: 'Şifre sıfırlama kodu gönderildi.', verify_id: verify.id };
    }

    async resetPassword(dto: ResetPasswordDto): Promise<any> {
        const verify = await this.verifyRepo.findOne({ where: { id: dto.verify_id, status: VerifyStatus.PENDING } });
        if (!verify || verify.expires_at < new Date() || verify.attempts_count >= 5) throw new BadRequestException('Geçersiz doğrulama işlemi.');
        if (verify.code !== dto.code) {
            verify.attempts_count += 1;
            await this.verifyRepo.save(verify);
            throw new BadRequestException('Doğrulama kodu hatalı.');
        };
        const forgetRecord = await this.forgetPasswordRepo.findOne({ where: { verify_id: dto.verify_id, is_used_at: IsNull() } });
        if (!forgetRecord) throw new BadRequestException('Kayıt bulunamadı.');

        const user = await this.userRepo.findOne({ where: { id: forgetRecord.user_id } });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

        user.password = await bcrypt.hash(dto.new_password, 10);
        await this.userRepo.save(user);

        verify.status = VerifyStatus.COMPLETED;
        forgetRecord.is_used_at = new Date();
        await Promise.all([
            this.verifyRepo.save(verify),
            this.forgetPasswordRepo.save(forgetRecord)
        ]);

        return { message: 'Şifreniz başarıyla sıfırlandı. Artık yeni şifrenizle giriş yapabilirsiniz.' };
    }

    async verifyAccount(dto: VerifyAccountDto) : Promise<any> {
        const whereConditions : any[] = [];
        if (dto.email) whereConditions.push({ email: dto.email });
        if (dto.phone) whereConditions.push({ phone: dto.phone });

        const user = await this.userRepo.findOne({ where: whereConditions });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

        if (user.status === UserStatus.ACTIVE) throw new UnauthorizedException('Hesap zaten doğrulanmış.');

        const verify = await this.verifyRepo.findOne({
            where: {user_id: user.id, type: VerifyType.VERIFY_ACCOUNT, status: VerifyStatus.PENDING },
            order: { expires_at: 'DESC' }
        });

        if (!verify) throw new BadRequestException('Doğrulama kodu bulunamadı. Lütfen tekrar deneyin.');

        if (verify.expires_at < new Date()) throw new BadRequestException('Doğrulama kodu süresi dolmuş. Lütfen tekrar deneyin.');

        if (verify.attempts_count >= 5) {
            verify.status = VerifyStatus.COMPLETED;
            await this.verifyRepo.save(verify);
            throw new BadRequestException('Çok fazla hatalı deneme. Lütfen yeni bir kod isteyin.');
        }

        if (verify.code !== dto.code) {
            verify.attempts_count += 1;
            await this.verifyRepo.save(verify);
            throw new BadRequestException('Doğrulama kodu hatalı. Lütfen tekrar deneyin.');
        }

        verify.status = VerifyStatus.COMPLETED;
        await this.verifyRepo.save(verify);

        user.status = UserStatus.ACTIVE;
        if (verify.channel === VerifyChannel.EMAIL) {
            user.email_verify_id = verify.id;
        }else {
            user.phone_verify_id = verify.id;
        }
        await this.userRepo.save(user);
        return { message: 'Hesabınız başarıyla doğrulandı. Artık giriş yapabilirsiniz.' };
    }

    async resendVerificationOtp(dto: ResendOtpDto, ip?: string, userAgent?: string): Promise<any> {
        const whereConditions : any[] = [];
        if (dto.email) whereConditions.push({ email: dto.email });
        if (dto.phone) whereConditions.push({ phone: dto.phone });

        const user = await this.userRepo.findOne({ where: whereConditions });
        if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

        if (user.status === UserStatus.ACTIVE) throw new BadRequestException('Hesap zaten doğrulanmış.');

        await this.verifyRepo.update({ user_id: user.id, type: VerifyType.VERIFY_ACCOUNT, status: VerifyStatus.PENDING }, { status: VerifyStatus.COMPLETED });

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const channel = dto.email ? VerifyChannel.EMAIL : VerifyChannel.SMS;

        const verify = this.verifyRepo.create({
            channel: channel,
            type: VerifyType.VERIFY_ACCOUNT,
            user_id: user.id,
            code: otpCode,
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            ip_address: ip || 'unknown',
            user_agent: userAgent || 'unknown'
        });

        await this.verifyRepo.save(verify);
        //TODO: SMS veya Email gönderme işlemi yapılacak
        console.log(`[HESAP DOĞRULAMA YENİDEN GÖNDERİLDİ] Hedef: ${dto.email || dto.phone} | Kod: ${otpCode} | IP: ${ip}`);  

        return { message: 'Yeni doğrulama kodu gönderildi.' };
    }
}
function uuidv4(): any {
    throw new Error('Function not implemented.');
}

