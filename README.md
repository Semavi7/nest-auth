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
| `email_verify_id` | bigint | Email doğrulama kaydının referansı |
| `phone_verify_id` | UUID | Telefon doğrulama kaydının referansı |
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
| `ip_address` | varchar | Oturum açılan IP adresi |
| `user_agent` | text | Tarayıcı/cihaz bilgisi |
| `last_active_at` | timestamp | Son aktivite zamanı |
| `expires_at` | timestamp | Oturum bitiş tarihi (7 gün) |
| `revoked_at` | timestamp | İptal edilme tarihi |
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

Tüm endpoint'ler `/auth` prefix'i altındadır. JWT koruması **global** olarak tüm route'lara uygulanır; aşağıdaki endpoint'ler `@Public()` dekoratörü ile açık bırakılmıştır.

### Kimlik Doğrulama

| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/auth/register` | Email veya telefon ile yeni kullanıcı kaydı oluşturur |
| `POST` | `/auth/login` | Email veya telefon ile giriş yapar, JWT cookie set eder |
| `GET` | `/auth/google` | Google OAuth2 akışını başlatır (yönlendirme) |
| `GET` | `/auth/google/callback` | Google OAuth2 callback URL'i |

### OTP Doğrulama

| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/auth/verify-account` | 6 haneli OTP kodu ile hesabı aktifleştirir |
| `POST` | `/auth/resend-verification-otp` | Hesap doğrulama kodunu yeniden gönderir |

### Şifre Yönetimi

| Metot | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/auth/forget-password` | Şifre sıfırlama OTP'si oluşturur ve gönderir |
| `POST` | `/auth/reset-password` | OTP kodu ile yeni şifre belirler |

---

### İstek / Yanıt Örnekleri

#### POST /auth/register

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

#### POST /auth/login

```json
// İstek
{ "email": "user@example.com", "password": "gizli123" }

// Yanıt 200 OK  —  Set-Cookie: Authentication=<jwt>; HttpOnly; SameSite=Strict
{ "message": "Giriş başarılı", "user": { "id": "uuid", "email": "user@example.com", "status": "active" } }
```

#### POST /auth/verify-account

```json
// İstek
{ "email": "user@example.com", "code": "482910" }

// Yanıt 200 OK
{ "message": "Hesabınız başarıyla doğrulandı. Artık giriş yapabilirsiniz." }
```

#### POST /auth/forget-password

```json
// İstek
{ "email": "user@example.com", "channel": "email" }

// Yanıt 200 OK
{ "message": "Şifre sıfırlama kodu gönderildi.", "verify_id": "uuid" }
```

#### POST /auth/reset-password

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

# 4. Migration'ları çalıştır (synchronize: false)
npx typeorm migration:run -d src/common/db/typeorm.config.ts

# 5. Geliştirme modunda başlat
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

- **Başlık:** Wibesoft E-Ticaret API
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

| Dosya | İçerik |
|---|---|
| `src/modules/auth/auth.controller.spec.ts` | Controller unit testleri |
| `src/modules/auth/auth.service.spec.ts` | Service unit testleri |
| `test/app.e2e-spec.ts` | End-to-end testler |

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
| SMS/Email gönderimi | Şu an `console.log` ile simüle edilmektedir — production öncesi Twilio, SendGrid veya AWS SES entegrasyonu yapılmalıdır |

---

## Lisans

UNLICENSED — Tüm hakları saklıdır.
