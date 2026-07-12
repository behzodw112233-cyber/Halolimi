import { Platform } from 'react-native';

const LOCAL_PAYTECH_CHECKOUT = 'http://127.0.0.1:8000';

export function browserCheckoutUrl(payUrl: string) {
  if (Platform.OS !== 'web' || process.env.NODE_ENV === 'production') return payUrl;

  try {
    const url = new URL(payUrl);
    const isPaytechSandboxCheckout =
      url.pathname.startsWith('/checkout/') &&
      (url.hostname === 'paytech.local' || url.hostname.endsWith('.loca.lt'));

    if (!isPaytechSandboxCheckout) return payUrl;

    const local = new URL(LOCAL_PAYTECH_CHECKOUT);
    local.pathname = url.pathname;
    local.search = url.search;
    local.hash = url.hash;
    return local.toString();
  } catch {
    return payUrl;
  }
}
