import { Fragment } from "react";
import { useParams } from "react-router-dom";
import { today } from "@internationalized/date";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/pages/external_page/_components/page-container";
import BookingCalendar from "@/pages/external_page/_components/booking-calendar";
import BookingForm from "@/pages/external_page/_components/booking-form";
import { useBookingState } from "@/hooks/use-booking-state";
import EventDetails from "@/pages/external_page/_components/event-details";
import { getMeetingDetailsQueryFn } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Loader } from "@/components/loader";
import { useStore } from "@/store/store";

const ReschedulePage = () => {
  const param = useParams();
  const meetingId = param.meetingId as string;

  const { next, timezone, selectedDate } = useBookingState();

  const { data, isFetching, isLoading, isError, error } = useQuery({
    queryKey: ["meeting_details", meetingId],
    queryFn: () => getMeetingDetailsQueryFn(meetingId),
  });

  const meeting = data;

  return (
    <PageContainer
      isLoading={isLoading}
      className={cn(
        `!min-w-auto sm:!w-auto`,
        isFetching || isError ? "sm:!min-w-[72%]" : "",
        selectedDate && "sm:!w-[98%]"
      )}
    >
      {/* {Error Alert } */}
      <ErrorAlert isError={isError} error={error} />

      {isFetching || isError ? (
        <div className="flex items-center justify-center min-h-[15vh]">
          <Loader size="lg" color="black" />
        </div>
      ) : (
        meeting && (
          <div className="w-full flex flex-col lg:flex-row items-stretch justify-stretch p-0 px-1">
            {/* {Event Details} */}
            <EventDetails
              eventTitle={meeting?.title}
              description={meeting?.description}
              user={meeting?.user}
              eventLocationType={meeting?.locationType}
              username={meeting?.user?.username || ""}
              duration={meeting?.duration}
            />
            {/* {Calendar & Booking form} */}
            <div className="min-w-sm max-w-3xl flex-shrink-0 flex-1">
              {next ? (
                <Fragment>
                  {/* {Booking Form} */}
                  <BookingForm eventId={meeting.id} duration={meeting.duration} />
                </Fragment>
              ) : (
                <Fragment>
                  {/* {Booking Calendar} */}
                  <BookingCalendar
                    eventId={meeting.id}
                    minValue={today(timezone)}
                    defaultValue={today(timezone)}
                    onSlotSelect={(slot) => {
                      // Handle slot selection
                      console.log("Selected slot:", slot);
                    }}
                    isPending={false}
                  />
                </Fragment>
              )}
            </div>
          </div>
        )
      )}
    </PageContainer>
  );
};

export default ReschedulePage; 