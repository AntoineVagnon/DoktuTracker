import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PostConsultationSurveyProps {
  appointmentId: number;
  doctorName: string;
  isOpen: boolean;
  onClose: () => void;
  userRole: 'patient' | 'doctor';
}

export function PostConsultationSurvey({ 
  appointmentId, 
  doctorName, 
  isOpen, 
  onClose,
  userRole = 'patient'
}: PostConsultationSurveyProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const submitSurveyMutation = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      const response = await apiRequest(
        'POST',
        `/api/appointments/${appointmentId}/survey`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/appointments`] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit survey",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Please rate your experience",
        description: "Select a star rating before submitting",
        variant: "destructive"
      });
      return;
    }

    submitSurveyMutation.mutate({ rating, comment });
  };

  const handleSkip = async () => {
    // For patients, we'll show a reminder later
    if (userRole === 'patient') {
      try {
        await apiRequest(
          'POST',
          `/api/appointments/${appointmentId}/survey/skip`
        );
      } catch (error) {
        console.error('Failed to skip survey:', error);
      }
    }
    onClose();
  };

  const renderStars = () => {
    return (
      <div className="flex gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hoveredRating || rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How was your consultation?</DialogTitle>
          <DialogDescription>
            {userRole === 'patient' 
              ? `Please rate your experience with Dr. ${doctorName}`
              : 'Your feedback helps us improve our service'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">Overall Rating</p>
            {renderStars()}
            {rating > 0 && (
              <p className="text-sm text-center text-gray-600">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label htmlFor="comment" className="text-sm font-medium">
              Additional Comments (Optional)
            </label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || submitSurveyMutation.isPending}
              className="flex-1"
            >
              {submitSurveyMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={submitSurveyMutation.isPending}
            >
              {userRole === 'patient' ? 'Skip for now' : 'Skip'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}