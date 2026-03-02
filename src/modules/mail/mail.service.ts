import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import { SendOtpEvent } from './events/send-otp.event';

@Injectable()
export class MailService {
    private transperter;

    constructor(){
        this.transperter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    @OnEvent('mail.send-otp')
    async handleSendOptEvent(event: SendOtpEvent) {
        console.log(`[Event Yakalandı] ${event.email} adresine mail gönderiliyor...`);

        try {
            await this.transperter.sendMail({
                from: `"TrendBol E-Ticaret" <${process.env.SMTP_USER}>`,
        to: event.email,
        subject: 'TrendBol Hesap Doğrulama Kodu',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Merhaba! TrendBol'a Hoş Geldiniz.</h2>
            <p>Hesabınızı doğrulamak için lütfen aşağıdaki kodu kullanın:</p>
            <h1 style="color: #4CAF50; letter-spacing: 5px;">${event.code}</h1>
            <p>Bu kod 5 dakika boyunca geçerlidir.</p>
          </div>
        `
            });
            console.log(`[Mail Başarılı] OTP Maili ${event.email} adresine iletildi.`);
        } catch (error) {
            console.error(`[Mail Hatası] Mail gönderilemedi: ${error.message}`);
        }
    }
}
