import DoctorSidebar from "./DoctorSidebar";
import Header from "./Header";
import Footer from "./Footer";

interface DoctorLayoutProps {
  children: React.ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DoctorSidebar />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}