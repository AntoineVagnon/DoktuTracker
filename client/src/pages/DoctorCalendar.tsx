import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import DoctorLayout from "@/components/DoctorLayout";
import { useState } from "react";

export default function DoctorCalendar() {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start on Monday
    return startOfWeek;
  });

  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const startFormatted = startDate.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long' 
    });
    const endFormatted = endDate.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const getDaysOfWeek = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'prev' ? -7 : 7));
      return newDate;
    });
  };

  const WeekView = () => {
    const daysOfWeek = getDaysOfWeek(currentWeek);
    
    return (
      <div className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{formatWeekRange(currentWeek)}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
              →
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Header with days */}
          <div className="grid grid-cols-8 bg-gray-50 border-b">
            <div className="p-3 text-sm font-medium text-gray-600">Heure</div>
            {daysOfWeek.map((day, index) => (
              <div key={index} className="p-3 text-center">
                <div className="text-xs text-gray-600 uppercase">
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </div>
                <div className="text-sm font-medium mt-1">
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="max-h-96 overflow-y-auto">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
                <div className="p-3 text-sm text-gray-600 bg-gray-50">{time}</div>
                {daysOfWeek.map((day, dayIndex) => (
                  <div key={dayIndex} className="p-1 border-l border-gray-200 hover:bg-blue-50 cursor-pointer">
                    <div className="h-8 w-full rounded"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DoctorLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Edit calendar
          </Button>
        </div>

        {/* Calendar */}
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="week" className="space-y-6">
              <div className="flex justify-end">
                <TabsList>
                  <TabsTrigger value="month">Mois</TabsTrigger>
                  <TabsTrigger value="week">Semaine</TabsTrigger>
                  <TabsTrigger value="day">Jour</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="week">
                <WeekView />
              </TabsContent>

              <TabsContent value="month">
                <div className="text-center py-8 text-gray-500">
                  Vue mensuelle à implémenter
                </div>
              </TabsContent>

              <TabsContent value="day">
                <div className="text-center py-8 text-gray-500">
                  Vue journalière à implémenter
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DoctorLayout>
  );
}