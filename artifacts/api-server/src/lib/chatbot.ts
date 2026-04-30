import { db, appointmentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  ChatbotState,
  ChatbotResponse,
  AppointmentRow,
} from "./types";

const PHONE_REGEX = /^[+]?[\d][\d\s\-().]{6,}$/;

const STAFF_OPTIONS = [
  "Dr. Smith",
  "Dr. Patel",
  "Dr. Garcia",
  "Ms. Chen",
  "Mr. Johnson",
];

function emptyState(): ChatbotState {
  return { step: "greeting", data: {} };
}

function trim(s: string | undefined): string {
  return (s ?? "").trim();
}

function parseDateTime(input: string): Date | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) return direct;
  return null;
}

function formatAppointmentTime(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function handleChatbotTurn(
  message: string | undefined,
  incomingState: ChatbotState | undefined,
): Promise<ChatbotResponse> {
  let state: ChatbotState = incomingState ?? emptyState();
  const text = trim(message);

  // Allow restart at any time
  if (text.toLowerCase() === "restart" || text.toLowerCase() === "start over") {
    state = emptyState();
    return greet();
  }

  switch (state.step) {
    case "greeting":
      return greet();

    case "ask_name": {
      if (!text) {
        return reply(
          state,
          "I didn't catch that. What is your full name?",
          "ask_name",
          "text",
        );
      }
      const next: ChatbotState = {
        step: "ask_address",
        data: { ...state.data, fullName: text },
      };
      return reply(
        next,
        `Nice to meet you, ${text.split(" ")[0]}! What is your address?`,
        "ask_address",
        "text",
      );
    }

    case "ask_address": {
      if (!text) {
        return reply(
          state,
          "Please share your address so we can keep it on file.",
          "ask_address",
          "text",
        );
      }
      const next: ChatbotState = {
        step: "ask_phone",
        data: { ...state.data, address: text },
      };
      return reply(
        next,
        "Got it. Can I have your phone number?",
        "ask_phone",
        "text",
      );
    }

    case "ask_phone": {
      if (!PHONE_REGEX.test(text)) {
        return reply(
          state,
          "That phone number doesn't look right. Please enter a valid number (e.g. +1 555 123 4567).",
          "ask_phone",
          "text",
        );
      }
      const next: ChatbotState = {
        step: "ask_reason",
        data: { ...state.data, phoneNumber: text },
      };
      return reply(
        next,
        "Thanks. What is the reason for your visit?",
        "ask_reason",
        "text",
      );
    }

    case "ask_reason": {
      if (!text) {
        return reply(
          state,
          "A short description of the reason helps us prepare. What is the reason for your visit?",
          "ask_reason",
          "text",
        );
      }
      const next: ChatbotState = {
        step: "ask_staff",
        data: { ...state.data, reason: text },
      };
      return {
        reply: "Who would you like to meet with?",
        state: next,
        options: STAFF_OPTIONS,
        inputType: "choice",
      };
    }

    case "ask_staff": {
      if (!text) {
        return {
          reply: "Please pick a staff member.",
          state,
          options: STAFF_OPTIONS,
          inputType: "choice",
        };
      }
      const next: ChatbotState = {
        step: "ask_datetime",
        data: { ...state.data, requestedStaff: text },
      };
      return reply(
        next,
        `Great. What date and time would you like to meet ${text}? (Pick a date & time)`,
        "ask_datetime",
        "datetime",
      );
    }

    case "ask_datetime": {
      const date = parseDateTime(text);
      if (!date) {
        return reply(
          state,
          "I couldn't read that time. Please pick a valid date and time.",
          "ask_datetime",
          "datetime",
        );
      }
      if (date.getTime() < Date.now()) {
        return reply(
          state,
          "That time is in the past. Please choose a future date and time.",
          "ask_datetime",
          "datetime",
        );
      }
      const staff = state.data.requestedStaff!;
      const conflict = await db
        .select()
        .from(appointmentsTable)
        .where(
          and(
            eq(appointmentsTable.requestedStaff, staff),
            eq(appointmentsTable.appointmentDate, date),
          ),
        );
      if (conflict.length > 0) {
        return reply(
          state,
          `I'm sorry, ${staff} is already booked at ${formatAppointmentTime(date)}. Please pick another time.`,
          "ask_datetime",
          "datetime",
        );
      }

      // Save the appointment
      try {
        const row = {
          id: randomUUID(),
          fullName: state.data.fullName!,
          address: state.data.address!,
          phoneNumber: state.data.phoneNumber!,
          reason: state.data.reason!,
          requestedStaff: staff,
          appointmentDate: date,
          status: "pending" as const,
        };
        const [inserted] = await db
          .insert(appointmentsTable)
          .values(row)
          .returning();
        const next: ChatbotState = {
          step: "done",
          data: { ...state.data, appointmentDate: date.toISOString() },
        };
        return {
          reply: `Appointment confirmed! See you then.\n\nWith: ${staff}\nWhen: ${formatAppointmentTime(date)}\n\nWe'll reach out at ${row.phoneNumber} if anything changes.`,
          state: next,
          options: ["Book another appointment"],
          inputType: "none",
          appointment: serializeAppointment(inserted),
        };
      } catch {
        return reply(
          state,
          "Sorry, something went wrong saving your appointment. Please try a different time.",
          "ask_datetime",
          "datetime",
        );
      }
    }

    case "done":
    case "confirm":
    default:
      return greet();
  }
}

function greet(): ChatbotResponse {
  return {
    reply: "Welcome! What is your full name?",
    state: { step: "ask_name", data: {} },
    options: [],
    inputType: "text",
  };
}

function reply(
  state: ChatbotState,
  text: string,
  step: ChatbotState["step"],
  inputType: "text" | "datetime" | "choice" | "none",
): ChatbotResponse {
  return {
    reply: text,
    state: { ...state, step },
    options: [],
    inputType,
  };
}

export function serializeAppointment(row: AppointmentRow) {
  return {
    id: row.id,
    fullName: row.fullName,
    address: row.address,
    phoneNumber: row.phoneNumber,
    reason: row.reason,
    requestedStaff: row.requestedStaff,
    appointmentDate: row.appointmentDate.toISOString(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
