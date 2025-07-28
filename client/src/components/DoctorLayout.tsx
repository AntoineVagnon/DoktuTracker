import DoctorTopNavigation from "./DoctorTopNavigation";
import Footer from "./Footer";

interface DoctorLayoutProps {
  children: React.ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DoctorTopNavigation />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      <Footer />
    </div>
  );
}