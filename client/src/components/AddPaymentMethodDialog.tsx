import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CreditCard, AlertCircle } from "lucide-react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Load Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PaymentForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the SetupIntent
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/dashboard?tab=settings&subtab=payment",
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "An error occurred");
        setIsProcessing(false);
        return;
      }

      if (setupIntent && setupIntent.status === "succeeded") {
        toast({
          title: "Payment method added",
          description: "Your payment method has been successfully added.",
        });
        onSuccess();
      } else {
        setErrorMessage("Failed to add payment method");
        setIsProcessing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Add Payment Method
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function AddPaymentMethodDialog({ open, onOpenChange }: AddPaymentMethodDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch Setup Intent when dialog opens
  useEffect(() => {
    if (open && !clientSecret) {
      fetchSetupIntent();
    }
  }, [open]);

  const fetchSetupIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/payment-methods/setup-intent");
      const data = await response.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError("Failed to initialize payment setup");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load payment form");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    // Refresh payment methods list
    queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });

    // Reset state and close dialog
    setClientSecret(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setClientSecret(null);
    onOpenChange(false);
  };

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setError(null);
    }
  }, [open]);

  const elementsOptions: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#2563eb",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "6px",
      },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a credit or debit card to your account
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={fetchSetupIntent}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <PaymentForm onSuccess={handleSuccess} onCancel={handleCancel} />
            </Elements>
          ) : null}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>🔒 Your payment information is encrypted and secure</p>
          <p>Powered by Stripe</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
