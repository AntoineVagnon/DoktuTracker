import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddPaymentMethodDialog } from "./AddPaymentMethodDialog";

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name?: string;
    email?: string;
  };
  is_default?: boolean;
}

export function PaymentMethodsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);

  // Fetch payment methods
  const { data: paymentMethods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
    refetchOnWindowFocus: false,
  });

  // Delete payment method mutation
  const deleteMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest("DELETE", `/api/payment-methods/${paymentMethodId}`);
      if (!response.ok) {
        throw new Error("Failed to delete payment method");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({
        title: "Payment method removed",
        description: "Your payment method has been successfully removed.",
      });
      setMethodToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      });
    },
  });

  // Set default payment method mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await apiRequest("POST", `/api/payment-methods/${paymentMethodId}/set-default`);
      if (!response.ok) {
        throw new Error("Failed to set default payment method");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({
        title: "Default payment method updated",
        description: "Your default payment method has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update default payment method",
        variant: "destructive",
      });
    },
  });

  const getCardBrandIcon = (brand: string) => {
    // You can add actual brand icons here
    return <CreditCard className="h-6 w-6" />;
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h3 className="text-lg font-medium">Payment Methods</h3>
        <p className="text-sm text-gray-500 mt-1">
          Manage your payment methods for appointments and subscriptions
        </p>
      </div>

      {/* Add Payment Method Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => setShowAddPaymentDialog(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Payment Methods List */}
      {!paymentMethods || paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No payment methods
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Add a payment method to book appointments
              </p>
              <Button onClick={() => setShowAddPaymentDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <Card key={method.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">
                      {getCardBrandIcon(method.card?.brand || "card")}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">
                          {formatCardBrand(method.card?.brand || "Card")} •••• {method.card?.last4}
                        </h4>
                        {method.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Expires {method.card?.exp_month}/{method.card?.exp_year}
                      </p>
                      {method.billing_details?.name && (
                        <p className="text-sm text-gray-500">
                          {method.billing_details.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!method.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(method.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMethodToDelete(method)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Secure Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              All payment information is encrypted and processed securely through Stripe.
              We never store your full card details.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Default Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Your default payment method will be used for all future appointments and
              subscription renewals.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!methodToDelete} onOpenChange={() => setMethodToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this payment method?
              {methodToDelete?.is_default && (
                <span className="block mt-2 text-amber-600 font-medium">
                  This is your default payment method. You'll need to set another as default.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => methodToDelete && deleteMutation.mutate(methodToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={showAddPaymentDialog}
        onOpenChange={setShowAddPaymentDialog}
      />
    </div>
  );
}
