import GoogleStyleCalendar from "@/components/GoogleStyleCalendar";
import DoctorLayout from "@/components/DoctorLayout";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorCalendar() {
  const { user } = useAuth();
  
  return (
    <DoctorLayout>
      <GoogleStyleCalendar />
    </DoctorLayout>
  );
}