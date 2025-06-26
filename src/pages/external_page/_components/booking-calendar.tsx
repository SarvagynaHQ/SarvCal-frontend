import { format } from "date-fns";
import { Calendar } from "@/components/calendar";
import { CalendarDate, DateValue } from "@internationalized/date";
import { useBookingState } from "@/hooks/use-booking-state";
import { decodeSlot, formatSlot } from "@/lib/helper";
import { 
  getPublicAvailabilityByEventIdQueryFn,
  getPublicBookedSlotsByEventIdAndDateQueryFn,
  getGoogleCalendarConflictsQueryFn,
  checkGoogleCalendarIntegrationQueryFn
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/loader";
import HourButton from "@/components/HourButton";

interface BookingCalendarProps {
  eventId: string;
  isPending?: boolean;
  minValue?: DateValue;
  defaultValue?: DateValue;
}

const BookingCalendar = ({
  eventId,
  isPending,
  minValue,
  defaultValue,
}: BookingCalendarProps) => {
  if (isPending) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-4 rounded-lg">
          <p>Processing booking...</p>
        </div>
      </div>
    );
  }

  const {
    timezone,
    hourType,
    selectedDate,
    selectedSlot,
    handleSelectDate,
    handleSelectSlot,
    handleNext,
    setHourType,
  } = useBookingState();

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["availability_single_event", eventId],
    queryFn: () => getPublicAvailabilityByEventIdQueryFn(eventId),
  });

  // Fetch booked slots for the selected date to hide them completely
  const { data: bookedSlotsData, isFetching: isBookedSlotsFetching } = useQuery({
    queryKey: ["booked_slots", eventId, selectedDate?.toString()],
    queryFn: () => getPublicBookedSlotsByEventIdAndDateQueryFn(
      eventId,
      selectedDate ? format(selectedDate.toDate(timezone), "yyyy-MM-dd") : ""
    ),
    enabled: !!eventId && !!selectedDate,
    retry: false, // Don't retry if endpoint doesn't exist
    staleTime: 30 * 1000, // Cache for 30 seconds (short cache for real-time booking updates)
  });

  // Check if Google Calendar integration is enabled
  const { data: googleIntegrationData, isError: isGoogleIntegrationError } = useQuery({
    queryKey: ["google_calendar_integration", eventId],
    queryFn: () => checkGoogleCalendarIntegrationQueryFn(eventId),
    enabled: !!eventId,
    retry: false, // Don't retry if endpoint doesn't exist
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch Google Calendar conflicts for the selected date
  const { data: googleConflictsData, isFetching: isGoogleConflictsFetching, isError: isGoogleConflictsError } = useQuery({
    queryKey: ["google_calendar_conflicts", eventId, selectedDate?.toString()],
    queryFn: () => getGoogleCalendarConflictsQueryFn(
      eventId, 
      selectedDate ? format(selectedDate.toDate(timezone), "yyyy-MM-dd") : ""
    ),
    enabled: !!eventId && 
             !!selectedDate && 
             !isGoogleIntegrationError && 
             googleIntegrationData !== undefined &&
             googleIntegrationData?.isConnected === true,
    retry: false, // Don't retry if endpoint doesn't exist
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
  });

  const availability = data?.data ?? [];
  const bookedSlots = bookedSlotsData?.bookedSlots ?? [];
  const googleConflicts = (googleConflictsData?.conflicts ?? []) as string[];
  const hasGoogleIntegration = !isGoogleIntegrationError && (googleIntegrationData?.isConnected ?? false);

  // Log Google Calendar integration status for debugging
  if (isGoogleIntegrationError) {
    console.log("Google Calendar integration not available - using local availability only");
  }
  if (isGoogleConflictsError) {
    console.log("Google Calendar conflicts fetch failed - showing local availability only");
  }

  // Function to check if a time slot is in the excluded afternoon period (12:00-16:00)
  const isAfternoonSlot = (slot: string) => {
    // Parse the slot time (format: "HH:mm")
    const [hours, minutes] = slot.split(':').map(Number);
    const slotMinutes = hours * 60 + minutes;
    
    // 12:00 PM = 720 minutes, 4:00 PM = 960 minutes
    const startExclude = 12 * 60; // 12:00 PM
    const endExclude = 16 * 60;   // 4:00 PM
    
    return slotMinutes >= startExclude && slotMinutes < endExclude;
  };

  // Get time slots for the selected date and filter out afternoon slots
  const allTimeSlots = selectedDate
    ? availability?.find(
        (day) =>
          day.day ===
          format(selectedDate.toDate(timezone), "EEEE").toUpperCase()
      )?.slots || []
    : [];

  // Filter out afternoon slots (12:00 PM - 4:00 PM)
  const timeSlots = allTimeSlots.filter(slot => !isAfternoonSlot(slot));

  // Filter out booked slots
  const filteredTimeSlots = timeSlots.filter(slot => !bookedSlots.includes(slot));

  // Filter out Google Calendar conflicts
  const finalTimeSlots = filteredTimeSlots.filter(slot => !googleConflicts.includes(slot));

  const isDateUnavailable = (date: DateValue) => {
    // Get the day of the week (e.g., "MONDAY")
    const dayOfWeek = format(
      date.toDate(timezone), // the same as getLocalTimeZone()
      "EEEE"
    ).toUpperCase();
    // Check if the day is available
    const dayAvailability = availability.find((day) => day.day === dayOfWeek);
    return !dayAvailability?.isAvailable;
  };

  const handleChangeDate = (newDate: DateValue) => {
    const calendarDate = newDate as CalendarDate;
    handleSelectSlot(null);
    handleSelectDate(calendarDate); // Update useBookingState hook
  };

  const selectedTime = decodeSlot(selectedSlot, timezone, hourType);

  return (
    <div className="relative lg:flex-[1_1_50%] w-full flex-shrink-0 transition-all duration-220 ease-out p-4 pr-0">
      {/* Loader Overlay */}
      {(isFetching || isGoogleConflictsFetching || isBookedSlotsFetching) && (
        <div className="flex bg-white/60 !z-30 absolute w-[95%] h-full items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader size="lg" color="black" />
            <p className="text-sm text-gray-600">
              {isFetching && isGoogleConflictsFetching && isBookedSlotsFetching 
                ? "Loading availability, syncing calendar, and fetching booked slots..."
                : isFetching 
                  ? "Loading availability..."
                  : isGoogleConflictsFetching && hasGoogleIntegration
                    ? "Syncing with Google Calendar..."
                    : isBookedSlotsFetching
                      ? "Fetching booked slots..."
                      : "Loading..."
              }
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col h-full mx-auto pt-[25px]">
        <h2 className="text-xl mb-5 font-bold">Select a Date &amp; Time</h2>
        
        {/* Google Calendar Sync Status */}
        {hasGoogleIntegration && (
          <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">
                Google Calendar sync enabled - showing real-time availability
              </span>
            </div>
          </div>
        )}
        
        <div className="w-full flex flex-col md:flex-row lg:flex-[1_1_300px]">
          <div className="w-full flex justify-start max-w-xs md:max-w-full lg:max-w-sm">
            <Calendar
              className="w-auto md:w-full lg:!w-auto"
              minValue={minValue}
              defaultValue={defaultValue}
              value={selectedDate}
              timezone={timezone}
              onChange={handleChangeDate}
              isDateUnavailable={isDateUnavailable}
            />
          </div>
          {selectedDate && availability ? (
            <div className="w-full flex-shrink-0 mt-3 lg:mt-0 max-w-xs md:max-w-[40%] pt-0 overflow-hidden md:ml-[-15px]">
              <div className="w-full pb-3  flex flex-col md:flex-row justify-between pr-8">
                <h3 className=" mt-0 mb-[10px] font-normal text-base leading-[38px]">
                  {format(selectedDate.toDate(timezone), "EEEE d")}
                </h3>

                <div className="flex h-9 w-full max-w-[107px] items-center border rounded-sm">
                  <HourButton
                    label="12h"
                    isActive={hourType === "12h"}
                    onClick={() => setHourType("12h")}
                  />
                  <HourButton
                    label="24h"
                    isActive={hourType === "24h"}
                    onClick={() => setHourType("24h")}
                  />
                </div>
              </div>

              <div
                className="flex-[1_1_100px] pr-[8px] overflow-x-hidden overflow-y-auto scrollbar-thin
             scrollbar-track-transparent scroll--bar h-[400px]"
              >
                {finalTimeSlots.map((slot, i) => {
                  const formattedSlot = formatSlot(slot, timezone, hourType);
                  return (
                    <div role="list" key={i}>
                      <div
                        role="listitem"
                        className="m-[10px_10px_10px_0] relative text-[15px]"
                      >
                        {/* Selected Time and Next Button */}
                        <div
                          className={`absolute inset-0 z-20 flex items-center gap-1.5 justify-between
                             transform transition-all duration-400 ease-in-out ${
                               selectedTime === formattedSlot
                                 ? "translate-x-0 opacity-100"
                                 : "translate-x-full opacity-0"
                             }`}
                        >
                          <button
                            type="button"
                            className="w-full h-[52px] text-white rounded-[4px] bg-black/60 font-semibold disabled:opacity-100 disabled:pointer-events-none tracking-wide"
                            disabled
                          >
                            {formattedSlot}
                          </button>
                          <button
                            type="button"
                            className="w-full cursor-pointer h-[52px] bg-[rgb(0,105,255)] text-white rounded-[4px] hover:bg-[rgba(0,105,255,0.8)] font-semibold tracking-wide"
                            onClick={handleNext}
                          >
                            Book
                          </button>
                        </div>

                        {/* Time Slot Button */}
                        <button
                          type="button"
                          className={`w-full h-[52px] cursor-pointer border border-[rgba(0,105,255,0.5)] text-[rgb(0,105,255)] rounded-[4px] font-semibold hover:border-2 hover:border-[rgb(0,105,255)] tracking-wide transition-all duration-400 ease-in-out
                           ${
                             selectedTime === formattedSlot
                               ? "opacity-0"
                               : "opacity-100"
                           }
                           `}
                          onClick={() => {
                            handleSelectSlot(slot);
                          }}
                        >
                          {formattedSlot}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* {Error Alert } */}
      <ErrorAlert isError={isError} error={error} />
    </div>
  );
};

export default BookingCalendar;
