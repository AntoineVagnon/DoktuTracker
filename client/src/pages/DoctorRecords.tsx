import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, User } from "lucide-react";
import DoctorLayout from "@/components/DoctorLayout";

export default function DoctorRecords() {
  return (
    <DoctorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Patient Records</h1>
          <Button>
            <User className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search patients by name, email, or appointment..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patient Records List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No patient records yet
              </h3>
              <p className="text-gray-500 mb-4">
                Patient records will appear here after consultations
              </p>
              <Button variant="outline">
                View All Appointments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DoctorLayout>
  );
}