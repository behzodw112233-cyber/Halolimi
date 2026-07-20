# SMS OTP

Halolmi uses backend-generated OTP codes for phone login and listing publish verification.

## Providers

Set Convex environment variables:

```text
SMS_OTP_PROVIDER=dev | devsms | eskiz
SMS_OTP_EXPOSE_DEV_CODE=true
OTP_HASH_SECRET=<long random secret>
```

`dev` is the free local/dev mode. It logs the code in Convex logs and returns it to the app only when `SMS_OTP_EXPOSE_DEV_CODE=true`.

For DevSMS:

```text
SMS_OTP_PROVIDER=devsms
DEVSMS_TOKEN=<token>
SMS_OTP_SERVICE_NAME=Halolmi
```

For Eskiz:

```text
SMS_OTP_PROVIDER=eskiz
ESKIZ_EMAIL=<email>
ESKIZ_PASSWORD=<password>
ESKIZ_FROM=4546
```

## Notes

- Uzbekistan SMS is not truly free in production. Keep Telegram contact verification as the free verification path.
- DevSMS Universal OTP is the quickest paid path because it supports pre-approved OTP templates.
- OTP requests are rate-limited by phone and purpose.
- Codes expire after 5 minutes and are stored as hashes, not plaintext.
