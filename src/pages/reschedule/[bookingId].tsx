import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BookingCalendar from '../external_page/_components/booking-calendar';
import { getBookingDetails, rescheduleBooking } from '../../lib/api';
import { format, parseISO } from 'date-fns';

export default function ReschedulePage() {
  const { bookingId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch booking details
  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBookingDetails(bookingId!),
    enabled: !!bookingId,
  });

  // Reschedule mutation
  const { mutate, isPending } = useMutation({
    mutationFn: rescheduleBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      toast.success('Booking rescheduled successfully');
      navigate(`/booking-confirmed/${bookingId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reschedule booking');
    },
  });

  const handleReschedule = (newSlot: string) => {
    if (!bookingId || !newSlot) return;
    mutate({ bookingId, newStartTime: newSlot });
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading booking details</div>;
  if (!booking) return <div>Booking not found</div>;

  const originalStartTime = parseISO(booking.startTime);
  const originalEndTime = parseISO(booking.endTime);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Reschedule Your Booking</h1>
      
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Current Booking Details</h2>
        <p>Event: {booking.event.title}</p>
        <p>Time: {format(originalStartTime, 'PPPp')} - {format(originalEndTime, 'p')}</p>
        <p>Duration: {booking.event.duration} minutes</p>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Select New Time</h2>
        <BookingCalendar 
          eventId={booking.event.id} 
          mode="reschedule"
          onSlotSelect={handleReschedule}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
