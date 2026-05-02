export type { AppointmentRow } from "@workspace/db";

export type ChatbotStep =
  | "greeting"
  | "ask_name"
  | "ask_address"
  | "ask_phone"
  | "ask_email"
  | "ask_reason"
  | "ask_staff"
  | "ask_datetime"
  | "confirm"
  | "done";

export type ChatbotData = {
  fullName?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  reason?: string;
  requestedStaff?: string;
  appointmentDate?: string;
};

export type ChatbotState = {
  step: ChatbotStep;
  data: ChatbotData;
};

export type ChatbotResponse = {
  reply: string;
  state: ChatbotState;
  options: string[];
  inputType?: "text" | "datetime" | "choice" | "none";
  appointment?: ReturnType<
    typeof import("./chatbot").serializeAppointment
  > | null;
  error?: string | null;
  isError?: boolean | null;
};
