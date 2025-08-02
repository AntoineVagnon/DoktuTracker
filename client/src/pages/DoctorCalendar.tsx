import { CalendarView } from "@/components/CalendarView";
import DoctorLayout from "@/components/DoctorLayout";
import { useAuth } from "@/hooks/useAuth";

export default function DoctorCalendar() {
  const { user } = useAuth();
  
  return (
    <DoctorLayout>
      <CalendarView userRole="doctor" userId={user?.id} />
    </DoctorLayout>
  );
}