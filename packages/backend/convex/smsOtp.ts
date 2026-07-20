"use node";

import { v } from 'convex/values';
import { action } from './_generated/server';
import { api, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

declare const process: { env: Record<string, string | undefined> };

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const purposeValidator = v.union(v.literal('login'), v.literal('listing'));

type SmsProviderResult = {
  provider: string;
  messageId?: string;
  devCode?: string;
};

function normalizeUzPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  const local = digits.slice(-9);
  if (local.length !== 9) throw new Error("Telefon raqam +998 formatida bo'lishi kerak");
  return `+998${local}`;
}

function providerPhone(phone: string) {
  return phone.replace(/\D/g, '');
}

async function hashCode(phone: string, purpose: string, code: string) {
  const secret = process.env.OTP_HASH_SECRET ?? 'halolmi-dev-otp-secret';
  const bytes = new TextEncoder().encode(`${secret}:${phone}:${purpose}:${code}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

async function sendDevSms(phone: string, code: string): Promise<SmsProviderResult> {
  console.log(`[sms-otp:dev] ${phone} code=${code}`);
  return {
    provider: 'dev',
    devCode: process.env.SMS_OTP_EXPOSE_DEV_CODE === 'true' ? code : undefined,
  };
}

async function sendDevSmsProvider(phone: string, code: string, purpose: 'login' | 'listing'): Promise<SmsProviderResult> {
  const token = process.env.DEVSMS_TOKEN;
  if (!token) throw new Error('DEVSMS_TOKEN sozlanmagan');
  const templateType = purpose === 'login' ? 4 : 1;
  const res = await fetch('https://devsms.uz/api/send_sms.php', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: providerPhone(phone),
      type: 'universal_otp',
      template_type: templateType,
      service_name: process.env.SMS_OTP_SERVICE_NAME ?? 'Halolmi',
      otp_code: code,
    }),
  });
  const data = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: { sms_id?: string | number; request_id?: string } }
    | null;
  if (!res.ok || !data?.success) throw new Error('DevSMS OTP yuborilmadi');
  return {
    provider: 'devsms',
    messageId: String(data.data?.request_id ?? data.data?.sms_id ?? ''),
  };
}

async function eskizToken() {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) throw new Error('ESKIZ_EMAIL yoki ESKIZ_PASSWORD sozlanmagan');
  const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => null)) as { data?: { token?: string } } | null;
  const token = data?.data?.token;
  if (!res.ok || !token) throw new Error('Eskiz token olinmadi');
  return token;
}

async function sendEskizSms(phone: string, code: string, purpose: 'login' | 'listing'): Promise<SmsProviderResult> {
  const token = await eskizToken();
  const from = process.env.ESKIZ_FROM ?? '4546';
  const message =
    purpose === 'login'
      ? `Halolmi tizimiga kirish kodi: ${code}`
      : `Halolmi xizmatida amaliyotni tasdiqlash kodi: ${code}`;
  const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mobile_phone: providerPhone(phone),
      message,
      from,
    }),
  });
  const data = (await res.json().catch(() => null)) as { id?: string | number; message_id?: string | number } | null;
  if (!res.ok) throw new Error('Eskiz OTP yuborilmadi');
  return { provider: 'eskiz', messageId: String(data?.message_id ?? data?.id ?? '') };
}

async function sendSms(phone: string, code: string, purpose: 'login' | 'listing') {
  const provider = process.env.SMS_OTP_PROVIDER ?? 'dev';
  if (provider === 'devsms') return sendDevSmsProvider(phone, code, purpose);
  if (provider === 'eskiz') return sendEskizSms(phone, code, purpose);
  return sendDevSms(phone, code);
}

export const request = action({
  args: {
    phone: v.string(),
    purpose: v.optional(purposeValidator),
  },
  handler: async (ctx, { phone: rawPhone, purpose = 'login' }) => {
    const phone = normalizeUzPhone(rawPhone);
    await ctx.runMutation((internal as any).rateLimit.consumeActionLimit, {
      name: 'otpPhone',
      key: `${purpose}:${phone}`,
    });
    const code = newCode();
    const sent = await sendSms(phone, code, purpose);
    await ctx.runMutation(internal.smsOtpMutations.createRequest, {
      phone,
      purpose,
      codeHash: await hashCode(phone, purpose, code),
      provider: sent.provider,
      providerMessageId: sent.messageId || undefined,
      expiresAt: Date.now() + OTP_TTL_MS,
    });
    return {
      ok: true,
      phone,
      expiresInMs: OTP_TTL_MS,
      provider: sent.provider,
      devCode: sent.devCode,
    };
  },
});

export const verify = action({
  args: {
    phone: v.string(),
    code: v.string(),
    purpose: v.optional(purposeValidator),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { phone: rawPhone, code: rawCode, purpose = 'login', name }): Promise<{
    ok: boolean;
    userId: Id<'users'> | null;
  }> => {
    const phone = normalizeUzPhone(rawPhone);
    const code = rawCode.replace(/\D/g, '');
    await ctx.runMutation((internal as any).rateLimit.consumeActionLimit, {
      name: 'otpVerify',
      key: `${purpose}:${phone}`,
    });
    const verified = await ctx.runMutation(internal.smsOtpMutations.verifyRequest, {
      phone,
      purpose,
      codeHash: await hashCode(phone, purpose, code),
    });
    if (!verified) return { ok: false, userId: null };
    if (purpose !== 'login') return { ok: true, userId: null };
    const userId = await ctx.runMutation((api as any).users.getOrCreate, { phone, name }) as Id<'users'>;
    return { ok: true, userId: userId as Id<'users'> };
  },
});
