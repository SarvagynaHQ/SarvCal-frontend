import {
  AvailabilityType,
  CreateEventPayloadType,
  CreateMeetingType,
  GetAllIntegrationResponseType,
  LoginResponseType,
  loginType,
  MeetingDetailType,
  PeriodType,
  PublicAvailabilityEventResponseType,
  PublicEventResponseType,
  PublicSingleEventDetailResponseType,
  registerType,
  ToggleEventVisibilityResponseType,
  UserAvailabilityResponseType,
  UserEventListResponse,
  UserMeetingsResponseType,
  RescheduleMeetingType,
} from "@/types/api.type";
import { API, PublicAPI } from "./axios-client";
import { IntegrationAppType, VideoConferencingPlatform } from "./types";

export const loginMutationFn = async (
  data: loginType
): Promise<LoginResponseType> => {
  const response = await API.post("/auth/login", data);
  return response.data;
};

export const registerMutationFn = async (data: registerType) =>
  await API.post("/auth/register", data);

//*********** */ EVENT APIS
export const CreateEventMutationFn = async (data: CreateEventPayloadType) =>
  await API.post("/event/create", data);

export const toggleEventVisibilityMutationFn = async (data: {
  eventId: string;
}): Promise<ToggleEventVisibilityResponseType> => {
  const response = await API.put("/event/toggle-privacy", data);
  return response.data;
};

export const geteventListQueryFn = async (): Promise<UserEventListResponse> => {
  const response = await API.get(`/event/all`);
  return response.data;
};

//*********** */ INTEGRATION APIS

export const checkIntegrationQueryFn = async (
  appType: VideoConferencingPlatform
) => {
  const response = await API.get(`integration/check/${appType}`);
  return response.data;
};

export const getAllIntegrationQueryFn =
  async (): Promise<GetAllIntegrationResponseType> => {
    const response = await API.get(`integration/all`);
    return response.data;
  };

export const connectAppIntegrationQueryFn = async (
  appType: IntegrationAppType
) => {
  const response = await API.get(`integration/connect/${appType}`);
  return response.data;
};

//*********** */ Availability APIS

export const getUserAvailabilityQueryFn =
  async (): Promise<UserAvailabilityResponseType> => {
    const response = await API.get(`/availability/me`);
    return response.data;
  };

export const updateUserAvailabilityMutationFn = async (
  data: AvailabilityType
) => {
  const response = await API.put("/availability/update", data);
  return response.data;
};

//*********** */ Meeting APIS

export const getUserMeetingsQueryFn = async (
  filter: PeriodType
): Promise<UserMeetingsResponseType> => {
  const response = await API.get(
    `/meeting/user/all${filter ? `?filter=${filter}` : ""}`
  );
  return response.data;
};

export const cancelMeetingMutationFn = async (meetingId: string) => {
  const response = await API.put(`/meeting/cancel/${meetingId}`, {});
  return response.data;
};

export const getMeetingDetailsQueryFn = async (
  meetingId: string
): Promise<MeetingDetailType> => {
  const response = await API.get(`/meeting/${meetingId}`);
  return response.data;
};

export const rescheduleMeetingMutationFn = async (
  data: RescheduleMeetingType
) => {
  const response = await API.put("/meeting/reschedule", data);
  return response.data;
};

//*********** */ All EXTERNAL/PUBLIC APIS
export const getAllPublicEventQueryFn = async (
  username: string
): Promise<PublicEventResponseType> => {
  const response = await PublicAPI.get(`/event/public/${username}`);
  return response.data;
};

export const getSinglePublicEventBySlugQueryFn = async (data: {
  username: string;
  slug: string;
}): Promise<PublicSingleEventDetailResponseType> => {
  const response = await PublicAPI.get(
    `/event/public/${data.username}/${data.slug}`
  );
  return response.data;
};

export const getPublicAvailabilityByEventIdQueryFn = async (
  eventId: string
): Promise<PublicAvailabilityEventResponseType> => {
  const response = await PublicAPI.get(`/availability/public/${eventId}`);
  return response.data;
};

//Create Meeting Eventid
export const scheduleMeetingMutationFn = async (data: CreateMeetingType) => {
  const response = await API.post("/meeting/public/create", data);
  return response.data;
};

// Get booked slots for a specific date to hide them from available slots
export const getPublicBookedSlotsByEventIdAndDateQueryFn = async (
  eventId: string,
  date: string
): Promise<{message: string, bookedSlots: string[]}> => {
  const response = await PublicAPI.get(`/meeting/public/booked-slots/${eventId}?date=${date}`);
  return response.data;
};

// Get Google Calendar conflicts for real-time availability
export const getGoogleCalendarConflictsQueryFn = async (
  eventId: string, 
  date: string
): Promise<{conflicts: string[], message: string}> => {
  const response = await PublicAPI.get(`/calendar/google/conflicts/${eventId}?date=${date}`);
  return response.data;
};

// Get real-time availability with Google Calendar sync
export const getRealTimeAvailabilityQueryFn = async (
  eventId: string,
  date: string
): Promise<{availableSlots: string[], conflicts: string[], message: string}> => {
  const response = await PublicAPI.get(`/availability/realtime/${eventId}?date=${date}`);
  return response.data;
};

// Check if user has Google Calendar integration enabled
export const checkGoogleCalendarIntegrationQueryFn = async (
  eventId: string
): Promise<{
  message: string;
  isConnected: boolean;
  eventId: string;
  eventTitle: string;
  eventOwner: {
    id: string;
    email: string;
  };
  integration: {
    provider: string;
    app_type: string;
    category: string;
    connectedAt: string;
  };
}> => {
  const response = await PublicAPI.get(`/integration/google-calendar/check/${eventId}`);
  return response.data;
};

// Add to existing API functions
export const getBookingDetails = async (bookingId: string) => {
  const response = await API.get(`/api/booking/${bookingId}`);
  if (response.status !== 200) throw new Error('Failed to fetch booking details');
  return response.data;
};

export const rescheduleBooking = async (data: { 
  bookingId: string; 
  newStartTime: string 
}) => {
  const response = await API.patch(`/api/meeting/reschedule/${data.bookingId}`, {
    newStartTime: data.newStartTime
  });
  if (response.status !== 200) throw new Error('Failed to reschedule booking');
  return response.data;
};
