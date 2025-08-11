import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Video, Clock, Shield, User, Calendar, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import { format } from "date-fns";

interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  appointmentDate: string;
  status: string;
  zoomMeetingId?: string;
  zoomJoinUrl?: string;
  price: string;
  doctor?: {
    firstName: string;
    lastName: string;
    specialty: string;
  };
  patient?: {
    firstName: string;
    lastName: string;
  };
}

interface ZoomMeetingDetails {
  meetingId: string;
  joinUrl: string;
  startUrl?: string;
  password?: string;
  status: "active" | "expired";
}

export default function VideoConsultation() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = id ? parseInt(id) : null;

  const [timeUntilMeeting, setTimeUntilMeeting] = useState<number>(0);
  const [meetingStarted, setMeetingStarted] = useState(false);

  // Fetch appointment details
  const { data: appointment, isLoading: appointmentLoading } = useQuery<Appointment>({
    queryKey: [`/api/appointments/${appointmentId}`],
    enabled: !!appointmentId,
  });

  // Fetch Zoom meeting details
  const { data: zoomDetails, isLoading: zoomLoading } = useQuery<ZoomMeetingDetails>({
    queryKey: [`/api/appointments/${appointmentId}/zoom`],
    enabled: !!appointmentId && appointment?.status === 'paid',
    retry: 1
  });

  // Calculate time until meeting
  useEffect(() => {
    if (!appointment?.appointmentDate) return;

    const updateTimer = () => {
      const now = new Date();
      const appointmentTime = new Date(appointment.appointmentDate);
      const timeDiff = appointmentTime.getTime() - now.getTime();
      setTimeUntilMeeting(timeDiff);
      
      // Meeting can be joined 10 minutes before start time
      setMeetingStarted(timeDiff <= 10 * 60 * 1000);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [appointment?.appointmentDate]);

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return "Meeting time has passed";
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleJoinMeeting = () => {
    if (zoomDetails?.joinUrl) {
      window.open(zoomDetails.joinUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!appointmentId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription>
              Invalid appointment ID. Please check your link and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (appointmentLoading || zoomLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-muted rounded mb-4"></div>
            <div className="h-24 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription>
              Appointment not found. Please check your link and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (appointment.status !== 'paid') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription>
              This appointment is not confirmed yet. Please complete the payment process first.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Video Consultation</h1>
          <p className="text-muted-foreground">
            Your secure video consultation with {appointment.doctor?.firstName} {appointment.doctor?.lastName}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Doctor:</span>
                <span className="font-medium">
                  Dr. {appointment.doctor?.firstName} {appointment.doctor?.lastName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Specialty:</span>
                <span>{appointment.doctor?.specialty}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date & Time:</span>
                <span className="font-medium">
                  {format(new Date(appointment.appointmentDate), 'PPP p')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="default">Confirmed</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Video Meeting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Meeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {zoomDetails ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>
                      {timeUntilMeeting > 0 
                        ? `Starts in ${formatTimeRemaining(timeUntilMeeting)}`
                        : 'Meeting time has passed'
                      }
                    </span>
                  </div>
                  
                  {zoomDetails.password && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <Shield className="h-4 w-4" />
                        Meeting Password
                      </div>
                      <code className="text-sm font-mono">{zoomDetails.password}</code>
                      <p className="text-xs text-muted-foreground mt-2">
                        Note: New meetings no longer require passwords
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleJoinMeeting}
                    disabled={!meetingStarted && timeUntilMeeting > 10 * 60 * 1000}
                    className="w-full"
                    size="lg"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {meetingStarted ? 'Join Video Consultation' : 'Join Available 10 Min Before'}
                  </Button>

                  {!meetingStarted && timeUntilMeeting > 10 * 60 * 1000 && (
                    <p className="text-xs text-muted-foreground text-center">
                      The meeting room will open 10 minutes before your scheduled time
                    </p>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Video meeting details are not available yet. Please refresh the page or contact support if this issue persists.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pre-meeting Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Before Your Consultation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Technical Requirements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Stable internet connection</li>
                  <li>• Working camera and microphone</li>
                  <li>• Updated browser or Zoom app</li>
                  <li>• Quiet, private environment</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Preparation</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Have your medical history ready</li>
                  <li>• List current medications</li>
                  <li>• Prepare your questions</li>
                  <li>• Test your audio/video beforehand</li>
                </ul>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Your consultation is private and secure. All communications are encrypted and HIPAA compliant.</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}