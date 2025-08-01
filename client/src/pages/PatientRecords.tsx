import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, User, Heart, Plus, Upload, Download, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import DoctorLayout from "@/components/DoctorLayout";
import { formatUserFullName } from "@/lib/nameUtils";
import { formatAppointmentDateTimeUS } from "@/lib/dateUtils";

export default function PatientRecords() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Handle document download
  const handleDownloadDocument = async (document: any) => {
    try {
      console.log('📥 Starting download for:', document.fileName);
      
      const response = await fetch(`/api/documents/download/${document.id}`, {
        method: 'GET',
        credentials: 'include', // Include authentication cookies
      });
      
      console.log('📡 Download response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('📦 Blob created, size:', blob.size);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = document.fileName || 'download';
      
      // Append to body, click, and cleanup
      window.document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      console.log('✅ Download completed for:', document.fileName);
      
    } catch (error) {
      console.error('❌ Error downloading document:', error);
      // Show a more user-friendly error message
      alert(`Unable to download document: The file content is not available on the server. Only document metadata is currently stored.`);
    }
  };

  // Fetch doctor's patient records (from appointments)
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: !!user,
  });

  // Fetch health profile for selected patient
  const { data: healthProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: [`/api/health-profile/${selectedPatientId}`],
    enabled: !!selectedPatientId,
  });

  // Fetch documents for selected patient
  const { data: patientDocuments = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey: [`/api/documents/patient/${selectedPatientId}`],
    enabled: !!selectedPatientId,
  });

  // Get unique patients from appointments
  const uniquePatients = (appointments as any[])
    .filter((apt: any) => apt.patient)
    .reduce((acc: any[], apt: any) => {
      const existingPatient = acc.find(p => p.id === apt.patient.id);
      if (!existingPatient) {
        acc.push({
          ...apt.patient,
          appointmentCount: 1,
          lastAppointment: apt.appointmentDate,
          status: apt.status
        });
      } else {
        existingPatient.appointmentCount += 1;
        if (new Date(apt.appointmentDate) > new Date(existingPatient.lastAppointment)) {
          existingPatient.lastAppointment = apt.appointmentDate;
          existingPatient.status = apt.status;
        }
      }
      return acc;
    }, [])
    .sort((a: any, b: any) => new Date(b.lastAppointment).getTime() - new Date(a.lastAppointment).getTime());

  // Filter patients based on search
  const filteredPatients = uniquePatients.filter((patient: any) =>
    formatUserFullName(patient).toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already filtered in real-time
  };

  if (isLoading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DoctorLayout>
    );
  }

  // If a specific patient is selected, show patient detail view
  if (selectedPatientId) {
    const selectedPatient = uniquePatients.find((p: any) => p.id.toString() === selectedPatientId);
    const patientAppointments = (appointments as any[]).filter((apt: any) => apt.patient?.id.toString() === selectedPatientId);

    return (
      <DoctorLayout>
        <div className="space-y-6">
          {/* Header with back button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPatientId(null)}
                className="h-10"
              >
                ← Back to Records
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {selectedPatient ? formatUserFullName(selectedPatient) : 'Patient Record'}
                </h1>

              </div>
            </div>

          </div>

          {/* Patient Detail Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Patient Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Patient Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-base">{selectedPatient ? formatUserFullName(selectedPatient) : 'N/A'}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Appointments</label>
                      <p className="text-base">{selectedPatient?.appointmentCount || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Appointment</label>
                      <p className="text-base">
                        {selectedPatient?.lastAppointment ? 
                          formatAppointmentDateTimeUS(selectedPatient.lastAppointment) : 'N/A'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Health Profile */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Health Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingProfile ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : healthProfile && typeof healthProfile === 'object' && Object.keys(healthProfile).length > 0 ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                          <p className="text-base">{(healthProfile as any)?.dateOfBirth ? new Date((healthProfile as any).dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Gender</label>
                          <p className="text-base">{(healthProfile as any)?.gender || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Blood Type</label>
                          <p className="text-base">{(healthProfile as any)?.bloodType || 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Height</label>
                          <p className="text-base">{(healthProfile as any)?.height ? `${(healthProfile as any).height} cm` : 'Not provided'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Weight</label>
                          <p className="text-base">{(healthProfile as any)?.weight ? `${(healthProfile as any).weight} kg` : 'Not provided'}</p>
                        </div>
                        {(healthProfile as any)?.allergies && (healthProfile as any).allergies.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Allergies</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(healthProfile as any).allergies.map((allergy: string, index: number) => (
                                <Badge key={index} variant="destructive" className="text-xs">
                                  {allergy}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {(healthProfile as any)?.medications && (healthProfile as any).medications.length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Current Medications</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(healthProfile as any).medications.map((medication: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {medication}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Heart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No health profile available</p>
                        <p className="text-sm mt-1">Patient needs to complete their health profile</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Patient Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingDocuments ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : patientDocuments.length > 0 ? (
                    <div className="space-y-4">
                      {patientDocuments.map((document: any) => (
                        <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900">{document.fileName}</p>
                              <p className="text-sm text-gray-500">
                                Uploaded on {new Date(document.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {document.fileType?.toUpperCase() || 'FILE'}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadDocument(document)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>No documents uploaded yet</p>
                      <p className="text-sm mt-1">Patient hasn't uploaded any documents</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Consultation Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Notes list for each appointment */}
                    {patientAppointments.length > 0 ? (
                      patientAppointments
                        .sort((a: any, b: any) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
                        .map((appointment: any) => (
                          <div key={appointment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium">
                                  Appointment #{appointment.id}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {formatAppointmentDateTimeUS(appointment.appointmentDate)}
                                </p>
                              </div>
                              <Badge variant={appointment.status === 'paid' ? 'default' : 'secondary'}>
                                {appointment.status}
                              </Badge>
                            </div>
                            
                            {/* Note content area */}
                            <div className="border rounded-md p-3 bg-gray-50 min-h-[100px]">
                              <p className="text-sm text-gray-500 italic">
                                No consultation notes yet. Click to add notes for this appointment.
                              </p>
                            </div>
                            
                            <Button variant="outline" size="sm" className="mt-3">
                              Add Note
                            </Button>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No appointments found for notes</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Appointment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {patientAppointments.length > 0 ? (
                      patientAppointments
                        .sort((a: any, b: any) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime())
                        .map((appointment: any) => (
                          <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium">Appointment #{appointment.id}</p>
                                  <p className="text-sm text-gray-600">
                                    {formatAppointmentDateTimeUS(appointment.appointmentDate)}
                                  </p>
                                </div>
                                <Badge variant={appointment.status === 'paid' ? 'default' : 'secondary'}>
                                  {appointment.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">€{appointment.price || '35'}</span>
                              <Button variant="outline" size="sm">
                                View Notes
                              </Button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No appointment history found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DoctorLayout>
    );
  }

  // Main patient records list view
  return (
    <DoctorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Patient Records</h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Manage your patients' medical records and consultation history
            </p>
          </div>
          <Button className="h-11">
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patients by name, email, or appointment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patient records yet</h3>
                <p className="text-gray-600 mb-4">
                  Patient records will appear here after consultations
                </p>
                <Button variant="outline" onClick={() => setLocation('/doctor-dashboard')}>
                  View All Appointments
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPatients.map((patient: any) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedPatientId(patient.id.toString())}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {formatUserFullName(patient)}
                        </h3>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                        <p className="text-xs text-gray-500">
                          {patient.appointmentCount} appointment{patient.appointmentCount !== 1 ? 's' : ''} • 
                          Last: {formatAppointmentDateTimeUS(patient.lastAppointment)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={patient.status === 'paid' ? 'default' : 'secondary'}>
                        {patient.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        View Record
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DoctorLayout>
  );
}