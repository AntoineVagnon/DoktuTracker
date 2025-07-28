import { useAuth } from "@/hooks/useAuth";
import DoctorLayout from "@/components/DoctorLayout";
import DoctorSettingsTabs from "@/components/DoctorSettingsTabs";

export default function DoctorSettings() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <DoctorSettingsTabs />
    </DoctorLayout>
  );
}