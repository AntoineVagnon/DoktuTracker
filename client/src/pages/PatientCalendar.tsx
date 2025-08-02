import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Video, MapPin, CalendarDays, XCircle, FileText, Phone, Mail, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, isSameDay, isWithinInterval, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import GoogleStyleCalendar from "@/components/GoogleStyleCalendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentDate: string;
  status: string;
  consultationType?: 'in-person' | 'video';
  price: string;
  notes?: string;
  zoomJoinUrl?: string;
  doctor: {
    id: number;
    firstName?: string;
    lastName?: string;
    specialty: string;
    phone?: string;
    email: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface AppointmentDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export function PatientCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentModal, setAppointmentModal] = useState({ isOpen: false, appointment: null as Appointment | null });

  // Fetch patient's appointments
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments'],
    enabled: !!user
  });

  // Fetch documents for the selected appointment
  const { data: appointmentDocuments = [], isLoading: isLoadingDocs } = useQuery<AppointmentDocument[]>({
    queryKey: [`/api/appointments/${appointmentModal.appointment?.id}/documents`],
    enabled: !!appointmentModal.appointment?.id && appointmentModal.isOpen
  });

  // Filter appointments for the current view
  const getVisibleAppointments = () => {
    if (!appointments) return [];
    
    if (view === 'day') {
      return appointments.filter(apt => 
        isSameDay(new Date(apt.appointmentDate), currentDate)
      );
    }
    
    // For week and month views, return all appointments
    // The calendar component will handle the filtering
    return appointments;
  };

  const visibleAppointments = getVisibleAppointments();

  // Handle appointment click based on view
  const handleAppointmentClick = (appointment: Appointment) => {
    if (view === 'month') {
      // In monthly view, clicking an appointment switches to daily view
      const appointmentDate = new Date(appointment.appointmentDate);
      setCurrentDate(appointmentDate);
      setView('day');
    } else {
      // In weekly and daily views, show appointment details
      setAppointmentModal({ isOpen: true, appointment });
    }
  };

  // Handle day click in monthly view
  const handleDayClick = (date: Date) => {
    if (view === 'month') {
      setCurrentDate(date);
      setView('day');
    }
  };

  // Check if appointment is live for video calls
  const isAppointmentLive = (appointment: Appointment) => {
    if (appointment.consultationType !== 'video') return false;
    
    const now = new Date();
    const appointmentTime = new Date(appointment.appointmentDate);
    const startTime = addMinutes(appointmentTime, -15); // 15 minutes before
    const endTime = addMinutes(appointmentTime, 30); // 30 minutes after
    
    return isWithinInterval(now, { start: startTime, end: endTime });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <GoogleStyleCalendar
        doctorId={user?.id || ""}
        isPatientView={true}
        appointments={visibleAppointments}
        onAppointmentClick={handleAppointmentClick}
        onDayClick={handleDayClick}
        view={view}
        onViewChange={setView}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
      />

      {/* Appointment Details Modal */}
      <Dialog open={appointmentModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          setAppointmentModal({ isOpen: false, appointment: null });
        }
      }}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Appointment Details</DialogTitle>
          </DialogHeader>
          
          {appointmentModal.appointment && (
            <div className="space-y-4">
              {/* Doctor Info */}
              <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">Doctor Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-600 min-w-[80px]">Name:</span>
                    <span>Dr. {appointmentModal.appointment.doctor.user?.firstName || appointmentModal.appointment.doctor.firstName} {appointmentModal.appointment.doctor.user?.lastName || appointmentModal.appointment.doctor.lastName}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-gray-600 min-w-[80px]">Specialty:</span>
                    <span>{appointmentModal.appointment.doctor.specialty}</span>
                  </div>
                  {appointmentModal.appointment.doctor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{appointmentModal.appointment.doctor.phone}</span>
                    </div>
                  )}
                  {/* Only show email for future appointments */}
                  {new Date(appointmentModal.appointment.appointmentDate) > new Date() && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{appointmentModal.appointment.doctor.user?.email || appointmentModal.appointment.doctor.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Date:</span>
                  <span>{format(new Date(appointmentModal.appointment.appointmentDate), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Time:</span>
                  <span>{format(new Date(appointmentModal.appointment.appointmentDate), 'h:mm a')}</span>
                </div>
              </div>

              {/* Notes if any */}
              {appointmentModal.appointment.notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Notes:</span> {appointmentModal.appointment.notes}
                  </p>
                </div>
              )}

              {/* Documents Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Attached Documents</h3>
                {isLoadingDocs ? (
                  <p className="text-sm text-gray-500">Loading documents...</p>
                ) : appointmentDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {appointmentDocuments.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {doc.fileType} • {(doc.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/documents/download/${doc.id}`, {
                                credentials: 'include',
                              });
                              
                              if (!response.ok) {
                                throw new Error(`Failed to download: ${response.status}`);
                              }
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = doc.fileName;
                              a.click();
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              toast({
                                title: "Download failed",
                                description: "Unable to download document. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No documents attached to this appointment.</p>
                )}
              </div>

              {/* Live video call banner */}
              {isAppointmentLive(appointmentModal.appointment) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium mb-2">
                    Your video consultation is ready to start
                  </p>
                  <Button 
                    variant="default" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      if (appointmentModal.appointment?.zoomJoinUrl) {
                        window.open(appointmentModal.appointment.zoomJoinUrl, '_blank');
                      } else {
                        toast({
                          title: "Video call not available",
                          description: "The video link is not yet available. Please try again closer to the appointment time.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Join Video Call
                  </Button>
                </div>
              )}

              {/* Action Buttons - only for future appointments */}
              {new Date(appointmentModal.appointment.appointmentDate) > new Date() && 
               appointmentModal.appointment.status !== 'cancelled' && (
                <div className="space-y-2 pt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // TODO: Implement reschedule functionality
                      toast({
                        title: "Coming Soon",
                        description: "Rescheduling functionality will be available soon.",
                      });
                    }}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Reschedule Appointment
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={async () => {
                      if (confirm('Are you sure you want to cancel this appointment? You may be eligible for a refund.')) {
                        try {
                          await apiRequest('POST', `/api/appointments/${appointmentModal.appointment?.id}/cancel`);
                          queryClient.invalidateQueries({ queryKey: ['/api/patient/appointments'] });
                          toast({
                            title: "Appointment cancelled",
                            description: "Your appointment has been cancelled. Check your email for refund details."
                          });
                          setAppointmentModal({ isOpen: false, appointment: null });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to cancel appointment. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Appointment
                  </Button>
                </div>
              )}

              {/* Past appointment message */}
              {new Date(appointmentModal.appointment.appointmentDate) <= new Date() && 
               appointmentModal.appointment.status !== 'cancelled' && 
               !isAppointmentLive(appointmentModal.appointment) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    This appointment has already taken place.
                  </p>
                </div>
              )}

              {/* Cancelled appointment message */}
              {appointmentModal.appointment.status === 'cancelled' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    This appointment has been cancelled.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}