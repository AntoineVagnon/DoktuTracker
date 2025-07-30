import { loadStripe } from "@stripe/stripe-js";

if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLISHABLE_KEY');
}

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const STRIPE_CONFIG = {
  publicKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  currency: "eur",
  country: "FR",
};

export interface PaymentIntentData {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
}

export interface StripeElementsOptions {
  mode: "payment" | "subscription";
  amount?: number;
  currency?: string;
  appearance?: {
    theme?: "stripe" | "night";
    variables?: Record<string, string>;
  };
}

// Default Stripe Elements appearance configuration
export const DEFAULT_STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "hsl(207, 100%, 52%)",
    colorBackground: "#ffffff",
    colorText: "#1f2937",
    colorDanger: "#dc2626",
    fontFamily: "Inter, system-ui, sans-serif",
    spacingUnit: "4px",
    borderRadius: "8px",
  },
};

// Helper function to create Stripe Elements options
export const createStripeElementsOptions = (
  clientSecret: string,
  customOptions?: Partial<StripeElementsOptions>
): any => {
  return {
    clientSecret,
    appearance: DEFAULT_STRIPE_APPEARANCE,
    ...customOptions,
  };
};

// Helper function to format currency amounts
export const formatCurrency = (amount: number, currency = "EUR"): string => {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency,
  }).format(amount);
};

// Helper function to convert euros to cents for Stripe
export const eurosToCents = (euros: number): number => {
  return Math.round(euros * 100);
};

// Helper function to convert cents to euros
export const centsToEuros = (cents: number): number => {
  return cents / 100;
};

// Stripe error handling helper
export const getStripeErrorMessage = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  
  switch (error?.code) {
    case "card_declined":
      return "Your card was declined. Please try a different payment method.";
    case "expired_card":
      return "Your card has expired. Please use a different card.";
    case "incorrect_cvc":
      return "Your card's security code is incorrect.";
    case "processing_error":
      return "An error occurred while processing your card. Please try again.";
    case "rate_limit":
      return "Too many requests. Please wait a moment and try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
};

// Payment method types supported
export const SUPPORTED_PAYMENT_METHODS = [
  "card",
  "sepa_debit",
  "ideal",
  "bancontact",
] as const;

export type SupportedPaymentMethod = typeof SUPPORTED_PAYMENT_METHODS[number];

// Stripe webhook event types we handle
export const STRIPE_WEBHOOK_EVENTS = {
  PAYMENT_INTENT_SUCCEEDED: "payment_intent.succeeded",
  PAYMENT_INTENT_PAYMENT_FAILED: "payment_intent.payment_failed",
  INVOICE_PAYMENT_SUCCEEDED: "invoice.payment_succeeded",
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",
  CUSTOMER_SUBSCRIPTION_CREATED: "customer.subscription.created",
  CUSTOMER_SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  CUSTOMER_SUBSCRIPTION_DELETED: "customer.subscription.deleted",
} as const;
