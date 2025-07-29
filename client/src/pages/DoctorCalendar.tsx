import CalendarAvailabilityManager from "@/components/CalendarAvailabilityManager";
import DoctorLayout from "@/components/DoctorLayout";

export default function DoctorCalendar() {
  return (
    <DoctorLayout>
      <CalendarAvailabilityManager />
    </DoctorLayout>
  );
}