# NestJS Auth — Kimlik Doğrulama & Yetkilendirme Servisi

NestJS, TypeORM ve Passport.js ile geliştirilmiş, üretime hazır tam özellikli kimlik doğrulama backend'i. E-ticaret uygulamaları için tasarlanmıştır.

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Proje Yapısı](#proje-yapısı)
- [Veritabanı Şeması](#veritabanı-şeması)
- [API Endpointleri](#api-endpointleri)
- [Kimlik Doğrulama Akışları](#kimlik-doğrulama-akışları)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
- [Swagger Dokümantasyonu](#swagger-dokümantasyonu)
- [Testler](#testler)
- [Güvenlik Notları](#güvenlik-notları)
- [Değişiklik Geçmişi](#değişiklik-geçmişi)

---

## Özellikler

- **Email veya telefon numarası** ile kayıt ve giriş
- **OTP tabanlı hesap doğrulama** (Email veya SMS kanalı seçilebilir)
- **JWT kimlik doğrulaması** — HttpOnly cookie ile güvenli token iletimi
- **Google OAuth2 sosyal giriş** — Passport stratejisi ile tam entegrasyon
- **Şifremi unuttum / şifre sıfırlama** akışı (OTP tabanlı)
- **Doğrulama kodu yeniden gönderme**
- **Oturum yönetimi** — cihaz bilgisi, IP adresi ve user-agent takibi ile
- **Kapsamlı kullanıcı adresi** desteği (Kargo / Fatura / Her İkisi, kurumsal vergi bilgileri)
- **Sosyal hesap bağlama** (Google, Facebook, Twitter)
- **Global JWT Guard** + `@Public()` dekoratörü ile seçici endpoint koruması
- **Soft delete** desteği (`deleted_at` sütunu, TypeORM)
- **Swagger UI** ile interaktif API dokümantasyonu (`/api`)
- **class-validator** + **class-transformer** ile DTO doğrulaması

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Framework | NestJS v11 |
| Dil | TypeScript v5.7 |
| ORM | TypeORM v0.3 |
| Veritabanı | PostgreSQL |
| Kimlik Doğrulama | Passport.js (JWT, Local, Google OAuth2) |
| Şifreleme | bcrypt v6 |
| Doğrulama | class-validator, class-transformer |
| HTTP Güvenliği | cookie-parser, HttpOnly cookie, CORS |
| API Dokümantasyonu | @nestjs/swagger (Swagger UI) |
| Test | Jest, Supertest |

---

## Proje Yapısı

```
src/
├── main.ts                        # Bootstrap: Swagger, CORS, cookie-parser ayarları
├── app.module.ts                  # Global modül: ConfigModule, TypeORM, JwtAuthGuard
│
├── common/
│   └── db/
│       └── typeorm.config.ts      # TypeORM DataSource konfigürasyonu (.env okur)
│
└── modules/
    └── auth/
        ├── auth.module.ts         # Modül tanımı: JWT, Passport, TypeORM feature kayıtları
        ├── auth.controller.ts     # HTTP route handler'ları
        ├── auth.service.ts        # İş mantığı: register, login, OTP, OAuth, şifre sıfırlama
        │
        ├── decorators/
        │   ├── public.decorator.ts        # @Public()      — JWT guard'ı baypas eder
        │   └── current-user.decorator.ts  # @CurrentUser() — request'ten user çeker
        │
        ├── dto/
        │   ├── register-login.dto.ts          # Kayıt/giriş: email|phone + password
        │   ├── verify-account.dto.ts          # Hesap doğrulama: email|phone + 6 haneli kod
        │   ├── resend-otp.dto.ts              # OTP yeniden gönderim: email|phone
        │   ├── forget-password-request.dto.ts # Şifre sıfırlama isteği: email|phone + kanal
        │   └── reset.password.dto.ts          # Şifre sıfırlama: verify_id + kod + yeni şifre
        │
        ├── entities/
        │   ├── user.entity.ts              # users           — temel kullanıcı tablosu
        │   ├── user-sessions.entity.ts     # user_sessions   — oturum/cihaz takibi
        │   ├── verify.entity.ts            # verify          — OTP kayıtları
        │   ├── forget_password.entity.ts   # forget_password — şifre sıfırlama tokenları
        │   ├── socialites.entity.ts        # socialites      — OAuth provider bağlantıları
        │   └── user_addresses.entity.ts    # user_addresses  — kargo/fatura adresleri
        │
        ├── enums/
        │   ├── auth.user-status.enum.ts    # active | inactive | pending | suspended | blocked
        │   ├── auth.device-type.enum.ts    # web | ios | android
        │   ├── auth.socialite-type.enum.ts # google | facebook | twitter
        │   ├── auth.verify-channel.enum.ts # email | sms
        │   ├── auth.verify-type.enum.ts    # verify_account | forget_password
        │   ├── auth.verify-status.enum.ts  # pending | completed
        │   └── auth.address-type.enum.ts   # shipping | billing | both
        │
        ├── guards/
        │   ├── jwt-auth.guard.ts     # Global JWT guard — @Public() meta'sına saygı gösterir
        │   ├── local-auth.guard.ts   # Local strateji guard'ı
        │   └── google-auth.guard.ts  # Google OAuth guard'ı
        │
        └── strategies/
            ├── jwt.strategy.ts       # Cookie'den JWT okur, payload doğrular
            ├── local.strategy.ts     # Email/şifre doğrulaması
            └── google.strategy.ts    # Google OAuth2 profil doğrulaması

    └── mail/
        ├── mail.module.ts            # Modül tanımı: MailService provider
        ├── mail.service.ts           # SMTP transporter, mail.send-otp event dinleyicisi
        └── events/
            └── send-otp.event.ts     # OTP gönderim eventi: email + code
```

---

## Veritabanı Şeması

### `users`

| Sütun | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | Birincil anahtar |
| `first_name` | varchar | Ad (nullable) |
| `last_name` | varchar | Soyad (nullable) |
| `email` | varchar unique | E-posta (nullable) |
| `phone` | varchar | Telefon numarası (nullable) |
| `password` | varchar | bcrypt ile hashlenmiş şifre (nullable — OAuth kullanıcıları için) |
| `status` | enum | `active` \| `inactive` \| `pending` \| `suspended` \| `blocked` |
| `email_verify_id` | uuid nullable | Email doğrulama kaydının referansı (doğrulanmamış veya OAuth kullanıcılarda null) |
| `phone_verify_id` | uuid nullable | Telefon doğrulama kaydının referansı (doğrulanmamış veya OAuth kullanıcılarda null) |
| `created_at` | timestamp | Oluşturulma tarihi |
| `updated_at` | timestamp | Güncellenme tarihi |
| `deleted_at` | timestamp | Soft delete tarihi (nullable) |

### `user_sessions`

| Sütun | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID FK | → users.id (CASCADE DELETE) |
| `refresh_token_Hash` | varchar | Hashed refresh token |
| `device_id` | varchar | Cihaz kimliği |
| `device_type` | enum | `web` \| `ios` \| `android` |
| `divace_name` | varchar | Cihaz adı (nullable) |
| `ip_address` | varchar | Oturum açılan IP adresi (nullable) |
| `user_agent` | text | Tarayıcı/cihaz bilgisi |
| `last_active_at` | timestamp | Son aktivite zamanı |
| `expires_at` | timestamp | Oturum bitiş tarihi (7 gün) |
| `revoked_at` | timestamp | İptal edilme tarihi (nullable) |
| `created_at` | timestamp | Oluşturulma tarihi |

### `verify`

| Sütun | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID | FK → users.id |
| `channel` | enum | `email` \| `sms` |
| `type` | enum | `verify_account` \| `forget_password` |
| `code` | varchar | 6 haneli OTP kodu |
| `status` | enum | `pending` \| `completed` |
| `attempts_count` | smallint | Hatalı deneme sayısı (max 5) |
| `expires_at` | timestamp | Kodun geçerlilik süresi |
| `ip_address` | varchar | İstek IP adresi |
| `user_agent` | varchar | İstek user-agent bilgisi |

### `forget_password`

| Sütun | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID | FK → users.id |
| `verify_id` | UUID | FK → verify.id |
| `expires_at` | timestamp | Token geçerlilik süresi (15 dakika) |
| `is_used_at` | timestamp | Kullanılma zamanı (nullable) |

### `socialites`

| Sütun | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID FK | → users.id (CASCADE DELETE) |
| `type` | enum | `google` \| `facebook` \| `twitter` |
| `ref_id` | varchar | Provider'dan gelen kullanıcı ID'si |
| `email` | varchar | Provider e-postası (nullable) |
| `data` | jsonb | Ham profil verisi (avatar, raw_profile vb.) |

### `user_addresses`

| Sütun | Tip | Açıklama |
|---|---|---|
| `id` | UUID PK | Birincil anahtar |
| `user_id` | UUID FK | → users.id (CASCADE DELETE) |
| `title` | varchar | Adres başlığı (ör. "Ev", "İş") |
| `type` | enum | `shipping` \| `billing` \| `both` |
| `is_default` | boolean | Varsayılan adres mi? |
| `full_name` | varchar | Ad soyad |
| `phone` | varchar | Telefon numarası |
| `city_id` | UUID | Şehir referansı |
| `neighborhood_id` | UUID | Mahalle referansı |
| `address_line` | text | Açık adres |
| `zip_code` | varchar | Posta kodu (nullable) |
| `is_corporate` | boolean | Kurumsal fatura mı? |
| `company_name` | varchar | Şirket adı (nullable) |
| `tax_number` | varchar | Vergi numarası (nullable) |
| `tax_office` | varchar | Vergi dairesi (nullable) |
| `created_at` | timestamp | Oluşturulma tarihi |
| `updated_at` | timestamp | Güncellenme tarihi |
| `deleted_at` | timestamp | Soft delete tarihi (nullable) |

---

## API Endpointleri

Tüm endpoint'ler `/api/auth` prefix'i altındadır (`/api` global prefix + `/auth` controller prefix). JWT koruması **global** olarak tüm route'lara uygulanır; aşağıdaki endpoint'ler `@Public()` dekoratörü ile açık bırakılmıştır.

### Kimlik Doğrulama

| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/auth/register` | Email veya telefon ile yeni kullanıcı kaydı oluşturur |
| `POST` | `/api/auth/login` | Email veya telefon ile giriş yapar, JWT cookie set eder |
| `GET` | `/api/auth/google` | Google OAuth2 akışını başlatır (yönlendirme) |
| `GET` | `/api/auth/google/callback` | Google OAuth2 callback URL'i |

### OTP Doğrulama

| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/auth/verify-account` | 6 haneli OTP kodu ile hesabı aktifleştirir |
| `POST` | `/api/auth/resend-verification-otp` | Hesap doğrulama kodunu yeniden gönderir |

### Şifre Yönetimi

| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/api/auth/forget-password` | Şifre sıfırlama OTP'si oluşturur ve gönderir |
| `POST` | `/api/auth/reset-password` | OTP kodu ile yeni şifre belirler |

---

### İstek / Yanıt Örnekleri

#### POST /api/auth/register

```json
// İstek (email ile)
{ "email": "user@example.com", "password": "gizli123" }

// İstek (telefon ile)
{ "phone": "+905551234567", "password": "gizli123" }

// Yanıt 201 Created
{
  "message": "Kayıt başarılı. Lütfen gönderilen kod ile hesabınızı doğrulayın.",
  "user": { "id": "uuid", "email": "user@example.com", "status": "pending" }
}
```

#### POST /api/auth/login

```json
// İstek
{ "email": "user@example.com", "password": "gizli123" }

// Yanıt 200 OK  —  Set-Cookie: Authentication=<jwt>; HttpOnly; SameSite=Strict
{ "message": "Giriş başarılı", "user": { "id": "uuid", "email": "user@example.com", "status": "active" } }
```

#### POST /api/auth/verify-account

```json
// İstek
{ "email": "user@example.com", "code": "482910" }

// Yanıt 200 OK
{ "message": "Hesabınız başarıyla doğrulandı. Artık giriş yapabilirsiniz." }
```

#### POST /api/auth/forget-password

```json
// İstek
{ "email": "user@example.com", "channel": "email" }

// Yanıt 200 OK
{ "message": "Şifre sıfırlama kodu gönderildi.", "verify_id": "uuid" }
```

#### POST /api/auth/reset-password

```json
// İstek
{ "verify_id": "uuid", "code": "738201", "new_password": "yeniSifre123" }

// Yanıt 200 OK
{ "message": "Şifreniz başarıyla sıfırlandı. Artık yeni şifrenizle giriş yapabilirsiniz." }
```

---

## Kimlik Doğrulama Akışları

### 1. Kayıt ve Hesap Doğrulama

```
POST /auth/register
  └─ Kullanıcı PENDING statüsünde oluşturulur
  └─ 6 haneli OTP kodu (5 dk geçerli) Email/SMS ile gönderilir

POST /auth/verify-account  { email|phone + code }
  └─ Kod doğrulanır (max 5 yanlış deneme hakkı)
  └─ Kullanıcı ACTIVE yapılır, email/phone_verify_id güncellenir

POST /auth/login
  └─ JWT token HttpOnly cookie olarak set edilir (24 saat)
  └─ user_sessions tablosuna oturum kaydı eklenir (7 gün geçerli)
```

### 2. Şifremi Unuttum

```
POST /auth/forget-password  { email|phone + channel }
  └─ verify + forget_password kayıtları oluşturulur (15 dk geçerli)
  └─ verify_id yanıt olarak döner

POST /auth/reset-password  { verify_id + code + new_password }
  └─ Kod doğrulanır (max 5 yanlış deneme hakkı)
  └─ Şifre bcrypt ile yeniden hashlenerek güncellenir
  └─ Verify kaydı COMPLETED, forget_password.is_used_at set edilir
```

### 3. Google OAuth2

```
GET /auth/google
  └─ Kullanıcı Google login sayfasına yönlendirilir

GET /auth/google/callback  (Google tarafından çağrılır)
  └─ Mevcut socialite kaydı varsa bağlı kullanıcı döner
  └─ Email eşleşmesi varsa mevcut hesaba socialite bağlanır
  └─ Yoksa yeni kullanıcı (ACTIVE) + socialite kaydı oluşturulur
  └─ JWT cookie set edilir → http://localhost:3000/dashboard adresine yönlendirilir
```

### 4. JWT Cookie Akışı

```
Giriş sonrası:
  Set-Cookie: Authentication=<jwt>; HttpOnly; SameSite=Strict; MaxAge=86400

Korumalı endpoint isteği:
  JwtStrategy  → Authentication cookie'den token extract eder
  JwtAuthGuard → token doğrular; @Public() olan route'ları atlar
  @CurrentUser() → { userId, email } döner
```

---

## Ortam Değişkenleri

Proje kökünde `.env` dosyası oluşturun:

```env
# Uygulama
PORT=3000
NODE_ENV=development

# Veritabanı (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_db_password
DB_NAME=nestjs_auth

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars

# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Mail (SMTP)
SMTP_HOST=smtp.example.com
SMTP_USER=no-reply@example.com
SMTP_PASS=your_smtp_password
```

> **Google OAuth2 kurulumu:** [Google Cloud Console](https://console.cloud.google.com/) üzerinden OAuth 2.0 Client oluşturun ve Yetkili yönlendirme URI'ları kısmına `http://localhost:3000/auth/google/callback` ekleyin.

---

## Kurulum ve Çalıştırma

### Gereksinimler

- Node.js >= 20
- npm >= 10
- PostgreSQL >= 14

### Adımlar

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. .env dosyasını oluştur ve doldur

# 3. PostgreSQL veritabanını oluştur
createdb nestjs_auth

# 4. Geliştirme modunda başlat (synchronize: true ile şema otomatik oluşturulur)
npm run start:dev
```

### NPM Script'leri

| Komut | Açıklama |
|---|---|
| `npm run start` | Üretim modunda başlat |
| `npm run start:dev` | Watch modunda geliştirme sunucusu |
| `npm run start:debug` | Debug ve watch modunda başlat |
| `npm run start:prod` | Derlenmiş `dist/` çıktısını çalıştır |
| `npm run build` | TypeScript'i `dist/` klasörüne derle |
| `npm run lint` | ESLint çalıştır ve otomatik düzelt |
| `npm run format` | Prettier ile kodu formatla |
| `npm run test` | Unit testleri çalıştır |
| `npm run test:watch` | Watch modunda unit testler |
| `npm run test:cov` | Test coverage raporu |
| `npm run test:e2e` | End-to-end testleri çalıştır |

---

## Swagger Dokümantasyonu

Uygulama çalışırken:

```
http://localhost:3000/api
```

- **Başlık:** TrendBol E-Ticaret API
- **Versiyon:** 1.0
- Bearer Auth desteği ile korumalı endpoint'leri Swagger UI üzerinden test edebilirsiniz
- Tüm endpoint'ler, DTO şemaları ve enum değerleri otomatik belgelenir

---

## Testler

```bash
npm run test        # Unit testler
npm run test:e2e    # End-to-end testler
npm run test:cov    # Coverage raporu
```

Test dosyaları `test/` dizini altında düzenlenmiştir:

| Dosya | İçerik |
|---|---|
| `test/modules/auth/auth.controller.spec.ts` | Controller unit testleri |
| `test/modules/auth/auth.service.spec.ts` | Service unit testleri |
| `test/app.e2e-spec.ts` | End-to-end testler |

Jest konfigürasyonu (`package.json`):

- `rootDir`: `.` (proje kökü)
- `testMatch`: `<rootDir>/test/**/*.spec.ts`
- `collectCoverageFrom`: `src/**/*.(t|j)s`
- `coverageDirectory`: `./coverage`

---

## Güvenlik Notları

| Konu | Uygulama |
|---|---|
| Şifre saklama | bcrypt (salt rounds: 10) |
| Token iletimi | HttpOnly + SameSite=Strict cookie (production'da Secure=true) |
| OTP deneme limiti | Max 5 yanlış deneme → kod otomatik geçersiz kılınır |
| OTP geçerlilik süresi | Hesap doğrulama: 5 dk / Şifre sıfırlama: 15 dk |
| CORS | Yalnızca `http://localhost:3000` (production'da güncellenmeli) |
| Soft delete | `deleted_at` ile kullanıcı verileri korunur, fiziksel silinmez |
| Email gönderimi | `nodemailer` + SMTP entegrasyonu tamamlandı; `SMTP_HOST/USER/PASS` ortam değişkenleri ile yapılandırılabilir |
| SMS gönderimi | Şu an `console.log` ile simüle edilmektedir — production öncesi Twilio veya benzer bir servis entegre edilmelidir |

---

## Değişiklik Geçmişi

### [d694733] — 2026-03-02

#### Yeni Özellikler

- **Email OTP gönderimi** entegre edildi: `nodemailer` ve `@nestjs/event-emitter` kullanılarak gerçek SMTP üzerinden doğrulama ve şifre sıfırlama kodları email ile gönderilmektedir
- **MailModule / MailService** oluşturuldu: SMTP bağlantısı `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` ortam değişkenlerinden okunur; `mail.send-otp` event'ini dinleyerek HTML formatlı OTP maili gönderir
- **SendOtpEvent** sınıfı eklendi (`src/modules/mail/events/send-otp.event.ts`): `email` ve `code` alanlarını taşıyan event nesnesi
- **EventEmitterModule** `app.module.ts`'e eklendi; tüm modüller arası event-driven iletişim etkinleştirildi
- **Global ValidationPipe** `main.ts`'e eklendi: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` seçenekleriyle DTO doğrulaması güçlendirildi
- **RegisterLoginResponseDto** oluşturuldu: `plainToInstance` + `@Expose()` ile register ve login yanıtlarında yalnızca izin verilen alanlar (`id`) döndürülmektedir

#### Değişiklikler

- **AuthService** — kayıt, şifre sıfırlama ve OTP yeniden gönderme akışlarında email kanalı seçildiğinde `mail.send-otp` event'i emit edilmektedir; `console.log` simülasyonu korunmaya devam etmektedir
- **AuthService** — `login()` dönüş anahtarı `access_token` → `accessToken` olarak yeniden adlandırıldı
- **AuthController** — `register` ve `login` (handleLoginSuccess) yanıtları `plainToInstance(RegisterLoginResponseDto, ...)` ile filtrelenmektedir
- **AuthController** — login route'undaki fazladan cookie set işlemi kaldırıldı; tüm cookie atama `handleLoginSuccess` metoduna taşındı
- **ForgetPasswordRequestDto** — kanal artık `email`/`phone` varlığından otomatik belirlenmektedir; `channel` alanı DTO'dan kaldırılmadı ancak service katmanında override edilmektedir
- **Swagger** — tüm DTO alanlarına (`email`, `phone`, `password`, `code`, `verify_id`, `new_password`, `channel`) `example` değerleri eklendi
- **Swagger başlığı** — "Wibesoft E-Ticaret API" → "TrendBol E-Ticaret API" olarak güncellendi

#### Veritabanı Şeması

- `users.email_verify_id`: tip `bigint` → `uuid nullable` olarak değiştirildi; varsayılan `'0'` kaldırıldı
- `users.phone_verify_id`: `nullable: true` olarak güncellendi; varsayılan `'00000000-...'` kaldırıldı
- OAuth ile oluşturulan kullanıcılarda da `email_verify_id` ve `phone_verify_id` artık `null` olarak kaydedilmektedir

#### Ortam Değişkenleri

Yeni eklenen değişkenler `.env.example`'a dahil edildi:

```env
# Mail (SMTP)
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

#### Güvenlik Notları Güncellemesi

- SMS/Email gönderim notu güncellendi: Email kanalı için `nodemailer` entegrasyonu production'a hazır hale getirildi; SMS kanalı (Twilio vb.) ilerleyen sürümlerde eklenecektir

---

### [3c2ad81] — 2026-03-01

#### Yeni Özellikler

- **Global API prefix** eklendi: tüm endpoint'ler artık `/api` ön eki ile erişilebilir (ör. `/api/auth/register`)

#### Test Yeniden Yapılandırması

- Controller ve service spec dosyaları `src/modules/auth/` konumundan `test/modules/auth/` konumuna taşındı
- Jest `rootDir` değeri `.` (proje kökü) olarak güncellendi; `testMatch` artık `test/**/*.spec.ts` kalıbını kullanıyor
- `collectCoverageFrom` kapsamı `src/**/*.(t|j)s` ile sınırlandırıldı; `coverageDirectory` `./coverage` olarak düzeltildi
- `test/modules/auth/auth.controller.spec.ts`: tüm controller metotlarını kapsayan kapsamlı birim testleri eklendi
- `test/modules/auth/auth.service.spec.ts`: `validateUser`, `register`, `login`, `forgetPassword`, `resetPassword`, `verifyAccount` ve `validateOAuthLogin` için kapsamlı servis testleri eklendi

#### Hata Düzeltmeleri

- `crypto.randomUUID()` kullanılarak `uuidv4()` bağımlılığı kaldırıldı (yerleşik Node.js API)
- `validateOAuthLogin`: `displayNmae` yazım hatası `displayName` olarak düzeltildi; `displayName` için null güvenliği eklendi
- `@CurrentUser()` dekoratörü imzası düzeltildi: `_data: unknown` parametresi eklendi

#### Veritabanı Şeması

- `user_sessions.divace_name`: `nullable: true` olarak güncellendi (`string | null`)
- `user_sessions.ip_address`: `nullable: true` olarak güncellendi
- `user_sessions.revoked_at`: `nullable: true` olarak güncellendi (`Date | null`)
- TypeORM `synchronize: true` olarak değiştirildi — geliştirme ortamında şema otomatik senkronize edilir

---

## Lisans

UNLICENSED — Tüm hakları saklıdır.
