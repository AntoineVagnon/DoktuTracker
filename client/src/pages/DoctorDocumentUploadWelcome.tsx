import { useState } from 'react';
import { Link } from 'wouter';
import { DoctorDocumentUpload } from '@/components/doctor/DoctorDocumentUpload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import {
  CheckCircle2,
  FileText,
  AlertCircle,
  ArrowRight,
  Clock
} from 'lucide-react';

export default function DoctorDocumentUploadWelcome() {
  const [approbationUploaded, setApprobationUploaded] = useState(false);
  const [facharzturkundeUploaded, setFacharzturkundeUploaded] = useState(false);
  const [zusatzbezeichnungUploaded, setZusatzbezeichnungUploaded] = useState(false);

  const requiredDocsUploaded = approbationUploaded && facharzturkundeUploaded;
  const progress = (
    (approbationUploaded ? 1 : 0) +
    (facharzturkundeUploaded ? 1 : 0) +
    (zusatzbezeichnungUploaded ? 0.5 : 0)
  ) / 2.5 * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Registration Successful!</h1>
          <p className="text-muted-foreground">
            Welcome to Doktu. Complete your profile by uploading your credential documents.
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Document Upload Progress</CardTitle>
            <CardDescription>
              Upload your medical credentials to activate your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Completion</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {!requiredDocsUploaded && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Required Documents</AlertTitle>
                <AlertDescription>
                  Please upload <strong>Approbationsurkunde</strong> and <strong>Facharzturkunde</strong> to activate your account.
                  Your profile will not be visible to patients until these documents are verified by our admin team.
                </AlertDescription>
              </Alert>
            )}

            {requiredDocsUploaded && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900">All Required Documents Uploaded</AlertTitle>
                <AlertDescription className="text-green-800">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Your documents are now under review. You will receive an email notification within 2-3 business days.
                </AlertDescription>
              </Alert>
            )}

            {/* Document Checklist */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                {approbationUploaded ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={approbationUploaded ? 'text-green-900 font-medium' : 'text-muted-foreground'}>
                  Approbationsurkunde (Medical License)
                </span>
                {!approbationUploaded && <span className="text-xs text-red-600">Required</span>}
              </div>

              <div className="flex items-center gap-2">
                {facharzturkundeUploaded ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={facharzturkundeUploaded ? 'text-green-900 font-medium' : 'text-muted-foreground'}>
                  Facharzturkunde (Specialist Certification)
                </span>
                {!facharzturkundeUploaded && <span className="text-xs text-red-600">Required</span>}
              </div>

              <div className="flex items-center gap-2">
                {zusatzbezeichnungUploaded ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={zusatzbezeichnungUploaded ? 'text-green-900 font-medium' : 'text-muted-foreground'}>
                  Zusatzbezeichnung (Additional Qualifications)
                </span>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Sections */}
        <div className="space-y-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Required Documents
            </h2>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <DoctorDocumentUpload
                documentType="approbation"
                title="Approbationsurkunde"
                description="Medical license certificate (mandatory)"
                required
                onUploadSuccess={() => setApprobationUploaded(true)}
              />

              <DoctorDocumentUpload
                documentType="facharzturkunde"
                title="Facharzturkunde"
                description="Specialist certification (mandatory)"
                required
                onUploadSuccess={() => setFacharzturkundeUploaded(true)}
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Optional Documents
            </h2>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <DoctorDocumentUpload
                documentType="zusatzbezeichnung"
                title="Zusatzbezeichnung"
                description="Additional qualifications (optional)"
                onUploadSuccess={() => setZusatzbezeichnungUploaded(true)}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            variant="outline"
            size="lg"
          >
            <Link href="/doctor/documents">
              Upload Later
            </Link>
          </Button>

          {requiredDocsUploaded ? (
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <Link href="/doctor/dashboard">
                Continue to Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              size="lg"
            >
              Complete Required Uploads First
            </Button>
          )}
        </div>

        {/* Help Text */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Why are these documents required?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              We require official medical credential documents to verify your qualifications and ensure
              the safety and trust of our patients. All documents are reviewed by our admin team within 2-3 business days.
            </p>
            <p>
              <strong>You can upload documents now or later from your dashboard.</strong> However, your account
              will remain inactive until all required documents are uploaded and verified.
            </p>
            <div className="pt-2">
              <h4 className="font-medium text-foreground mb-2">Accepted Formats:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>PDF, JPG, PNG files</li>
                <li>Maximum file size: 10MB per document</li>
                <li>Documents must be clear and readable</li>
                <li>All information must be visible (name, dates, issuing authority)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
