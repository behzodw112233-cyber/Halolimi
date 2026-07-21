import { StripeProvider } from '@stripe/stripe-react-native';
import type { ReactElement, ReactNode } from 'react';

export function StripePaymentProvider({ children }: { children: ReactNode }) {
  return <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''} urlScheme="halolmia">{children as ReactElement}</StripeProvider>;
}
