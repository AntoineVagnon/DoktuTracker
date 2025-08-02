import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Video, Clock, AlertCircle, CheckCircle, Camera, Mic, User } from "lucide-react";
import { formatDistanceToNow, differenceInMinutes, addMinutes } from "date-fns";
import { utcToLocal } from "@/lib/timezoneUtils";
import { toast } from "@/hooks/use-toast";

interface VideoConsultationProps {
  appointment: any;
  userRole: 'patient' | 'doctor' | 'admin';
  onStatusUpdate?: (status: string) => void;
}

export function VideoConsultation({ appointment, userRole, onStatusUpdate }: VideoConsultationProps) {
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'live' | 'ended' | 'no-show'>('waiting');
  const [showEquipmentTest, setShowEquipmentTest] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [equipmentTestResult, setEquipmentTestResult] = useState<{camera: boolean; mic: boolean} | null>(null);
  const [doctorJoined, setDoctorJoined] = useState(false);
  const [patientJoined, setPatientJoined] = useState(false);

  const appointmentTime = utcToLocal(appointment.appointmentDate);
  const now = new Date();
  const minutesUntilStart = differenceInMinutes(appointmentTime, now);
  const minutesSinceStart = differenceInMinutes(now, appointmentTime);
  const endTime = addMinutes(appointmentTime, 30); // 30-minute sessions
  const minutesPastEnd = differenceInMinutes(now, endTime);

  // Determine session status
  useEffect(() => {
    const updateStatus = () => {
      if (minutesPastEnd > 5) {
        setSessionStatus('ended');
      } else if (minutesSinceStart >= 0 && minutesSinceStart <= 30) {
        setSessionStatus('live');
      } else if (minutesUntilStart <= 5) {
        setSessionStatus('waiting');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [minutesPastEnd, minutesSinceStart, minutesUntilStart]);

  // Handle equipment test
  const testEquipment = async () => {
    setShowEquipmentTest(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setEquipmentTestResult({ camera: true, mic: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Equipment test failed:', error);
      setEquipmentTestResult({ camera: false, mic: false });
    }
  };

  // Handle joining the session
  const joinSession = () => {
    if (!appointment.zoomJoinUrl) {
      toast({
        title: "Error",
        description: "Video link not available. Please contact support.",
        variant: "destructive"
      });
      return;
    }

    // Track who joined
    if (userRole === 'patient') setPatientJoined(true);
    if (userRole === 'doctor') setDoctorJoined(true);

    // Open Zoom link in new window
    window.open(appointment.zoomJoinUrl, '_blank', 'width=1200,height=800');
    
    // Update status
    onStatusUpdate?.('joined');
  };

  // Render based on user role and session status
  const renderPatientView = () => {
    // Show join button only if session is live or <5 min away
    const canJoin = sessionStatus === 'live' || (sessionStatus === 'waiting' && minutesUntilStart <= 5);

    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              Video Consultation
            </div>
            {sessionStatus === 'live' && (
              <Badge className="bg-green-600">Live</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session info */}
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Doctor:</strong> Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
            </p>
            <p className="text-sm">
              <strong>Scheduled:</strong> {appointmentTime.toLocaleString()}
            </p>
          </div>

          {/* Status-specific content */}
          {sessionStatus === 'waiting' && minutesUntilStart > 5 && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Your consultation will start in {formatDistanceToNow(appointmentTime)}
              </p>
            </div>
          )}

          {canJoin && (
            <>
              {/* Doctor late warning */}
              {minutesSinceStart > 5 && !doctorJoined && (
                <div className="bg-yellow-100 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Doctor is running late</p>
                    <p className="text-yellow-700">They should join shortly</p>
                  </div>
                </div>
              )}

              {/* Very late - offer reschedule */}
              {minutesSinceStart > 15 && !doctorJoined && (
                <div className="bg-red-100 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    Doctor hasn't joined yet
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      Reschedule (no charge)
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      Get refund + €10 credit
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={joinSession}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={!canJoin}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Video Call
                </Button>
                <Button
                  variant="outline"
                  onClick={testEquipment}
                  className="px-3"
                  title="Test equipment"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Health profile reminder */}
              {appointment.patient?.healthProfileStatus !== 'complete' && (
                <p className="text-xs text-blue-600">
                  <a href="/dashboard#settings" className="underline">Complete health profile</a> before your consultation
                </p>
              )}
            </>
          )}

          {sessionStatus === 'ended' && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-600">This consultation has ended</p>
              {!showSurvey && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => setShowSurvey(true)}
                >
                  Rate your experience
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDoctorView = () => {
    const canJoin = sessionStatus === 'live' || (sessionStatus === 'waiting' && minutesUntilStart <= 5);
    const isLate = minutesSinceStart > 5 && sessionStatus === 'live';
    const isVeryLate = minutesSinceStart > 15;

    return (
      <Card className={isLate ? "border-yellow-200 bg-yellow-50/50" : "border-green-200 bg-green-50/50"}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-600" />
              Video Consultation
            </div>
            <div className="flex items-center gap-2">
              {isLate && <Badge variant="destructive">You are late</Badge>}
              {sessionStatus === 'live' && <Badge className="bg-green-600">Live</Badge>}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Patient info */}
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Patient:</strong> {appointment.patient?.firstName} {appointment.patient?.lastName}
            </p>
            <p className="text-sm">
              <strong>Scheduled:</strong> {appointmentTime.toLocaleString()}
            </p>
          </div>

          {canJoin && (
            <div className="space-y-3">
              {/* Late warning */}
              {isVeryLate && (
                <div className="bg-red-100 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-800">
                    You are {minutesSinceStart} minutes late!
                  </p>
                  <p className="text-xs text-red-700">
                    Patient may have been offered refund options
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={joinSession}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Start Consultation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/patient/${appointment.patientId}`, '_blank')}
                >
                  <User className="h-4 w-4 mr-2" />
                  Review Profile
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderAdminView = () => {
    const canJoin = sessionStatus === 'live';

    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              Video Consultation Support
            </div>
            {sessionStatus === 'live' && <Badge className="bg-green-600">Live</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Doctor:</strong> Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
            </p>
            <p className="text-sm">
              <strong>Patient:</strong> {appointment.patient?.firstName} {appointment.patient?.lastName}
            </p>
            <p className="text-sm">
              <strong>Status:</strong> {!doctorJoined && minutesSinceStart > 0 ? 'Doctor not joined' : 'In progress'}
            </p>
          </div>

          {canJoin && (
            <Button 
              onClick={joinSession}
              variant="outline"
              className="w-full"
            >
              <Video className="h-4 w-4 mr-2" />
              Join as Support
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // Equipment test dialog
  const EquipmentTestDialog = () => (
    <Dialog open={showEquipmentTest} onOpenChange={setShowEquipmentTest}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Equipment Test</DialogTitle>
          <DialogDescription>
            Testing your camera and microphone...
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {equipmentTestResult ? (
            <>
              <div className="flex items-center gap-2">
                {equipmentTestResult.camera ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span>Camera: {equipmentTestResult.camera ? 'Working' : 'Not detected'}</span>
              </div>
              <div className="flex items-center gap-2">
                {equipmentTestResult.mic ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span>Microphone: {equipmentTestResult.mic ? 'Working' : 'Not detected'}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {userRole === 'patient' && renderPatientView()}
      {userRole === 'doctor' && renderDoctorView()}
      {userRole === 'admin' && renderAdminView()}
      <EquipmentTestDialog />
    </>
  );
}