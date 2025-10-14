import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/Header';
import { CheckCircle2, Clock, Mail, FileText, ArrowRight } from 'lucide-react';

export default function DoctorSignupSuccess() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Success Icon and Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Application Submitted Successfully!
          </h1>
          <p className="text-xl text-gray-600">
            Thank you for your interest in joining the Doktu platform
          </p>
        </div>

        {/* Main Success Message */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Check Your Email
            </CardTitle>
            <CardDescription>
              We've sent a confirmation email to your registered email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your application is now under review by our medical team. We'll contact you within <strong>2-3 business days</strong> with a decision.
              </AlertDescription>
            </Alert>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">What happens next?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Application Review</p>
                    <p className="text-sm text-blue-800">Our team will verify your credentials and medical license</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Email Notification</p>
                    <p className="text-sm text-blue-800">You'll receive an email with the outcome of your application</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Profile Completion</p>
                    <p className="text-sm text-blue-800">Once approved, complete your profile to activate your account</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Start Consultations</p>
                    <p className="text-sm text-blue-800">Set your availability and begin accepting patient bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Required Documents Notice */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Prepare Your Documents
            </CardTitle>
            <CardDescription>
              While we review your application, please prepare the following documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Medical License Copy</p>
                  <p className="text-sm text-gray-600">Clear, high-resolution scan or photo</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Proof of Identity</p>
                  <p className="text-sm text-gray-600">Passport or national ID card</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Professional Photo</p>
                  <p className="text-sm text-gray-600">Professional headshot for your profile</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">IBAN for Payments</p>
                  <p className="text-sm text-gray-600">Bank account for receiving consultation fees</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Information */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>
              We're here to support you through the process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              If you have any questions about your application or the onboarding process, please don't hesitate to reach out:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900 mb-1">Email Support</p>
                <a href="mailto:doctors@doktu.co" className="text-green-600 hover:text-green-700 underline">
                  doctors@doktu.co
                </a>
              </div>
              <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900 mb-1">Help Center</p>
                <Link href="/support">
                  <span className="text-green-600 hover:text-green-700 underline cursor-pointer">
                    Visit Support Center
                  </span>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="outline" size="lg">
              Return to Home
            </Button>
          </Link>
          <Link href="/support">
            <Button size="lg" className="bg-green-600 hover:bg-green-700">
              Visit Help Center
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Additional Tips */}
        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            Didn't receive a confirmation email? Check your spam folder or{' '}
            <a href="mailto:doctors@doktu.co" className="text-green-600 hover:text-green-700 underline">
              contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
