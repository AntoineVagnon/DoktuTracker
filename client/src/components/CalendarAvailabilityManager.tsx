import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Edit3, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  recurringUntil?: string;
}

interface SelectedRange {
  start: string;
  end: string;
  day: number; // 0-6 (Sunday-Saturday)
}

interface DoctorAvailabilityManagerProps {
  doctorId?: number;
}

export default function CalendarAvailabilityManager({ doctorId }: DoctorAvailabilityManagerProps) {
  const [availabilities, setAvailabilities] = useState<TimeSlot[]>([]);
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringUntil, setRecurringUntil] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteScope, setDeleteScope] = useState<"this-week" | "future" | "all">("this-week");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  // Get current doctor ID from user or passed prop
  const getCurrentDoctorId = async () => {
    if (doctorId) return doctorId;
    
    // Get current user and doctor info
    try {
      const response = await fetch('/api/user/profile');
      const user = await response.json();
      if (user.role === 'doctor') {
        const doctorResponse = await fetch(`/api/doctors?userId=${user.id}`);
        const doctors = await doctorResponse.json();
        return doctors[0]?.id;
      }
    } catch (error) {
      console.error('Error getting doctor ID:', error);
    }
    return null;
  };

  // Mutations for API calls
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: { doctorId: number; slots: Array<{ date: string; startTime: string; endTime: string; isRecurring?: boolean; recurringUntil?: string }> }) => {
      console.log('🚀 Batch creating availability blocks:', data);
      console.log('📤 Sending data to backend:', JSON.stringify(data));
      const response = await apiRequest('POST', '/api/time-slots/batch', data);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Successfully created availability slots:', data);
      toast({
        title: "Success",
        description: `Created ${data.slots?.length || 1} availability slots`,
      });
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      setIsCreating(false);
      setSelectedRange(null);
      setIsRecurring(false);
      setRecurringUntil("");
    },
    onError: (error: any) => {
      console.error('Error creating blocks:', error);
      toast({
        title: "Error creating availability",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const response = await apiRequest('DELETE', `/api/time-slots/${slotId}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Availability slot deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['time-slots'] });
      setDeleteModal(false);
      setSelectedSlot(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting availability",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Generate time slots for a week view
  const generateWeekView = () => {
    const weekSlots = [];
    for (let day = 1; day <= 5; day++) { // Monday to Friday
      for (let hour = 8; hour <= 18; hour++) { // 8 AM to 6 PM
        weekSlots.push({
          day,
          hour,
          time: `${hour.toString().padStart(2, '0')}:00`,
          isAvailable: false,
          availability: null as TimeSlot | null
        });
      }
    }
    return weekSlots;
  };

  const [weekSlots, setWeekSlots] = useState(generateWeekView());

  const handleSlotClick = (day: number, hour: number) => {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    const existingAvailability = availabilities.find(av => 
      av.startTime <= time && av.endTime > time
    );

    if (existingAvailability) {
      // Edit existing availability
      setEditingSlot(existingAvailability);
      setIsRecurring(existingAvailability.isRecurring);
      setRecurringUntil(existingAvailability.recurringUntil || "");
      setIsEditing(true);
    } else {
      // Start creating new availability
      // Handle edge case where hour + 1 might be 24 (midnight)
      const endHour = hour + 1 > 23 ? 23 : hour + 1;
      const endTime = hour + 1 > 23 ? "23:59" : `${(hour + 1).toString().padStart(2, '0')}:00`;
      setSelectedRange({ start: time, end: endTime, day });
      setIsCreating(true);
    }
  };

  const handleCreateAvailability = async () => {
    if (!selectedRange) return;

    try {
      const currentDoctorId = await getCurrentDoctorId();
      if (!currentDoctorId) {
        toast({
          title: "Error",
          description: "Unable to identify doctor. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const today = new Date();
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + selectedRange.day - today.getDay());

      const slotData = {
        date: slotDate.toISOString().split('T')[0],
        startTime: selectedRange.start,
        endTime: selectedRange.end,
        isRecurring,
        recurringUntil: isRecurring ? recurringUntil : undefined
      };

      createAvailabilityMutation.mutate({
        doctorId: currentDoctorId,
        slots: [slotData]
      });
    } catch (error) {
      console.error('Error in handleCreateAvailability:', error);
      toast({
        title: "Error",
        description: "Failed to create availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditAvailability = () => {
    if (!editingSlot) return;

    const updatedAvailabilities = availabilities.map(av => 
      av.id === editingSlot.id 
        ? { ...av, isRecurring, recurringUntil: isRecurring ? recurringUntil : undefined }
        : av
    );

    setAvailabilities(updatedAvailabilities);
    setIsEditing(false);
    setEditingSlot(null);
    setIsRecurring(false);
    setRecurringUntil("");
  };

  const handleDeleteAvailability = () => {
    if (!selectedSlot) return;

    if (selectedSlot.isRecurring) {
      // Handle recurring deletion based on scope
      console.log(`Deleting ${deleteScope} for slot ${selectedSlot.id}`);
    }

    deleteAvailabilityMutation.mutate(selectedSlot.id);
  };

  const openDeleteModal = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setDeleteModal(true);
  };

  const isSlotAvailable = (day: number, hour: number) => {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    return availabilities.some(av => 
      av.startTime <= time && av.endTime > time
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar & Availabilities</h2>
          <p className="text-gray-600">Manage your recurring and one-time availabilities</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Availability
        </Button>
      </div>

      {/* Weekly Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {/* Header row */}
            <div className="text-sm font-medium text-gray-500">Time</div>
            {days.slice(1, 6).map(day => (
              <div key={day} className="text-sm font-medium text-gray-900 text-center">
                {day}
              </div>
            ))}

            {/* Time slots */}
            {hours.slice(8, 19).map(hour => (
              <div key={hour} className="contents">
                <div className="text-sm text-gray-500 py-2">{hour}</div>
                {[1, 2, 3, 4, 5].map(day => {
                  const hourNum = hour && typeof hour === 'string' ? parseInt(hour.split(':')[0]) : 0;
                  const available = isSlotAvailable(day, hourNum);
                  return (
                    <button
                      key={`${day}-${hour}`}
                      onClick={() => handleSlotClick(day, hourNum)}
                      className={cn(
                        "h-10 border border-gray-200 rounded text-xs transition-colors",
                        available 
                          ? "bg-blue-100 border-blue-300 hover:bg-blue-200" 
                          : "hover:bg-gray-50"
                      )}
                    >
                      {available && (
                        <div className="flex items-center justify-center h-full">
                          <Clock className="h-3 w-3 text-blue-600" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Availabilities List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Availabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {availabilities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No availabilities set. Click on time slots above to add them.</p>
          ) : (
            <div className="space-y-2">
              {availabilities.map(slot => (
                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                    <div className="text-sm text-gray-500">
                      {slot.isRecurring ? `Recurring weekly until ${slot.recurringUntil}` : "One-time"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setEditingSlot(slot);
                        setIsRecurring(slot.isRecurring);
                        setRecurringUntil(slot.recurringUntil || "");
                        setIsEditing(true);
                      }}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openDeleteModal(slot)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Availability Modal */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Availability</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRange && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Start Time:</label>
                    <input
                      type="time"
                      value={selectedRange.start}
                      onChange={(e) => setSelectedRange({...selectedRange, start: e.target.value})}
                      className="px-2 py-1 border rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">End Time:</label>
                    <input
                      type="time"
                      value={selectedRange.end}
                      onChange={(e) => {
                        // Validate end time doesn't exceed 23:59
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        if (hours > 23 || (hours === 23 && minutes > 59)) {
                          setSelectedRange({...selectedRange, end: "23:59"});
                        } else {
                          setSelectedRange({...selectedRange, end: e.target.value});
                        }
                      }}
                      max="23:59"
                      className="px-2 py-1 border rounded"
                    />
                  </div>
                  <p><strong>Day:</strong> {days[selectedRange.day]}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Availability Type</label>
              <Select value={isRecurring ? "recurring" : "one-time"} onValueChange={(value) => setIsRecurring(value === "recurring")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time (non-recurring)</SelectItem>
                  <SelectItem value="recurring">Weekly recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isRecurring && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Recurring Until</label>
                <input
                  type="date"
                  value={recurringUntil}
                  onChange={(e) => setRecurringUntil(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateAvailability}
              disabled={createAvailabilityMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createAvailabilityMutation.isPending ? 'Creating...' : 'Create Availability'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Availability Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Availability</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {editingSlot && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p><strong>Time:</strong> {editingSlot.startTime} - {editingSlot.endTime}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Availability Type</label>
              <Select value={isRecurring ? "recurring" : "one-time"} onValueChange={(value) => setIsRecurring(value === "recurring")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-time (non-recurring)</SelectItem>
                  <SelectItem value="recurring">Weekly recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isRecurring && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Recurring Until</label>
                <input
                  type="date"
                  value={recurringUntil}
                  onChange={(e) => setRecurringUntil(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleEditAvailability}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Availability</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedSlot?.isRecurring ? (
              <div className="space-y-3">
                <p>This is a recurring availability. What would you like to delete?</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="this-week"
                      checked={deleteScope === "this-week"}
                      onChange={(e) => setDeleteScope(e.target.value as any)}
                    />
                    <span>This week only</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="future"
                      checked={deleteScope === "future"}
                      onChange={(e) => setDeleteScope(e.target.value as any)}
                    />
                    <span>All future weeks</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="all"
                      checked={deleteScope === "all"}
                      onChange={(e) => setDeleteScope(e.target.value as any)}
                    />
                    <span>Delete entire recurrence</span>
                  </label>
                </div>
              </div>
            ) : (
              <p>Are you sure you want to delete this availability? Existing booked appointments will be preserved.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAvailability}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}