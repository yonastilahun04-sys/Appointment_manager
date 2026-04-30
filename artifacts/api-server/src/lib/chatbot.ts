import { db, appointmentsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type {
  ChatbotState,
  ChatbotResponse,
  AppointmentRow,
} from "./types";

export type Lang = "en" | "am";

function isValidPhone(input: string): boolean {
  const cleaned = input.trim();
  if (!cleaned) return false;
  if (!/^[+\d\s\-().]+$/.test(cleaned)) return false;
  const digits = cleaned.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

const STAFF_OPTIONS = [
  "Dr. Yonas",
  "Dr. Abebe",
  "Dr. Adelegn",
  "Dr. Rosa",
  "Dr. Kalkidan",
  "Dr. Dereje",
];

type Strings = {
  welcome: string;
  niceToMeet: (firstName: string) => string;
  askAddress: string;
  askPhone: string;
  askReason: string;
  askStaff: string;
  askDateTime: (staff: string) => string;
  confirmed: (staff: string, when: string, phone: string) => string;
  bookAnother: string;
  errNoName: string;
  errNoAddress: string;
  errPhone: string;
  errNoReason: string;
  errPickStaff: string;
  errBadDate: string;
  errPastDate: string;
  errBooked: (staff: string, when: string) => string;
  errSave: string;
};

const EN: Strings = {
  welcome: "Welcome! What is your full name?",
  niceToMeet: (n) => `Nice to meet you, ${n}! What is your address?`,
  askAddress: "Please share your address so we can keep it on file.",
  askPhone: "Got it. Can I have your phone number?",
  askReason: "Thanks. What is the reason for your visit?",
  askStaff: "Who would you like to meet with?",
  askDateTime: (s) =>
    `Great. What date and time would you like to meet ${s}? (Pick a date & time)`,
  confirmed: (s, w, p) =>
    `Appointment confirmed! See you then.\n\nWith: ${s}\nWhen: ${w}\n\nWe'll reach out at ${p} if anything changes.`,
  bookAnother: "Book another appointment",
  errNoName: "I didn't catch that. What is your full name?",
  errNoAddress: "Please share your address so we can keep it on file.",
  errPhone:
    "That phone number doesn't look right. Please include the country code if you have one — for example +251 911 223344, +1 555 123 4567, or 0911223344.",
  errNoReason:
    "A short description of the reason helps us prepare. What is the reason for your visit?",
  errPickStaff: "Please pick a staff member.",
  errBadDate: "I couldn't read that time. Please pick a valid date and time.",
  errPastDate:
    "That time is in the past. Please choose a future date and time.",
  errBooked: (s, w) =>
    `I'm sorry, ${s} is already booked at ${w}. Please pick another time.`,
  errSave:
    "Sorry, something went wrong saving your appointment. Please try a different time.",
};

const AM: Strings = {
  welcome: "እንኳን ደህና መጡ! ሙሉ ስምዎ ማን ነው?",
  niceToMeet: (n) => `ደስ ብሎኛል፣ ${n}! አድራሻዎ ምንድነው?`,
  askAddress: "እባክዎ አድራሻዎን ያጋሩ።",
  askPhone: "እሺ። ስልክ ቁጥርዎን እባክዎ።",
  askReason: "አመሰግናለሁ። የጉብኝትዎ ምክንያት ምንድነው?",
  askStaff: "ከማን ጋር መገናኘት ይፈልጋሉ?",
  askDateTime: (s) =>
    `በጣም ጥሩ። ${s} ጋር መቼ መገናኘት ይፈልጋሉ? (ቀንና ሰዓት ይምረጡ)`,
  confirmed: (s, w, p) =>
    `ቀጠሮዎ ተረጋግጧል! በዚያን ጊዜ እንገናኛለን።\n\nከ: ${s}\nመቼ: ${w}\n\nነገር ቢለወጥ በ ${p} እንጠራዎታለን።`,
  bookAnother: "ሌላ ቀጠሮ ይያዙ",
  errNoName: "አልገባኝም። ሙሉ ስምዎ ማን ነው?",
  errNoAddress: "እባክዎ አድራሻዎን ያጋሩ።",
  errPhone:
    "ስልክ ቁጥሩ ትክክል አይመስልም። እባክዎ የአገር ኮድ ጨምረው ያስገቡ — ለምሳሌ +251 911 223344።",
  errNoReason: "የጉብኝትዎ ምክንያት አጭር መግለጫ ያስፈልገናል።",
  errPickStaff: "እባክዎ ሐኪም ይምረጡ።",
  errBadDate: "ጊዜውን ማንበብ አልቻልኩም። እባክዎ ትክክለኛ ቀንና ሰዓት ይምረጡ።",
  errPastDate: "ይህ ጊዜ ካለፈ ነው። እባክዎ ወደፊት ያለ ቀን ይምረጡ።",
  errBooked: (s, w) => `ይቅርታ፣ ${s} በ ${w} ቀድሞ ተይዟል። እባክዎ ሌላ ጊዜ ይምረጡ።`,
  errSave: "ይቅርታ፣ ቀጠሮዎን ሲያስቀምጥ ችግር ተፈጥሯል። እባክዎ ሌላ ጊዜ ይሞክሩ።",
};

function pick(lang: Lang | undefined): Strings {
  return lang === "am" ? AM : EN;
}

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

function formatAppointmentTime(d: Date, lang: Lang): string {
  return d.toLocaleString(lang === "am" ? "am-ET" : "en-US", {
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
  lang: Lang = "en",
): Promise<ChatbotResponse> {
  let state: ChatbotState = incomingState ?? emptyState();
  const text = trim(message);
  const S = pick(lang);

  if (
    text.toLowerCase() === "restart" ||
    text.toLowerCase() === "start over" ||
    text === "እንደገና"
  ) {
    state = emptyState();
    return greet(lang);
  }

  switch (state.step) {
    case "greeting":
      return greet(lang);

    case "ask_name": {
      if (!text) {
        return reply(state, S.errNoName, "ask_name", "text", true);
      }
      const next: ChatbotState = {
        step: "ask_address",
        data: { ...state.data, fullName: text },
      };
      return reply(
        next,
        S.niceToMeet(text.split(" ")[0]),
        "ask_address",
        "text",
      );
    }

    case "ask_address": {
      if (!text) {
        return reply(state, S.errNoAddress, "ask_address", "text", true);
      }
      const next: ChatbotState = {
        step: "ask_phone",
        data: { ...state.data, address: text },
      };
      return reply(next, S.askPhone, "ask_phone", "text");
    }

    case "ask_phone": {
      if (!isValidPhone(text)) {
        return reply(state, S.errPhone, "ask_phone", "text", true);
      }
      const next: ChatbotState = {
        step: "ask_reason",
        data: { ...state.data, phoneNumber: text.trim() },
      };
      return reply(next, S.askReason, "ask_reason", "text");
    }

    case "ask_reason": {
      if (!text) {
        return reply(state, S.errNoReason, "ask_reason", "text", true);
      }
      const next: ChatbotState = {
        step: "ask_staff",
        data: { ...state.data, reason: text },
      };
      return {
        reply: S.askStaff,
        state: next,
        options: STAFF_OPTIONS,
        inputType: "choice",
      };
    }

    case "ask_staff": {
      if (!text) {
        return {
          reply: S.errPickStaff,
          state,
          options: STAFF_OPTIONS,
          inputType: "choice",
          isError: true,
        };
      }
      const next: ChatbotState = {
        step: "ask_datetime",
        data: { ...state.data, requestedStaff: text },
      };
      return reply(next, S.askDateTime(text), "ask_datetime", "datetime");
    }

    case "ask_datetime": {
      const date = parseDateTime(text);
      if (!date) {
        return reply(state, S.errBadDate, "ask_datetime", "datetime", true);
      }
      if (date.getTime() < Date.now()) {
        return reply(state, S.errPastDate, "ask_datetime", "datetime", true);
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
          S.errBooked(staff, formatAppointmentTime(date, lang)),
          "ask_datetime",
          "datetime",
          true,
        );
      }

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
          reply: S.confirmed(
            staff,
            formatAppointmentTime(date, lang),
            row.phoneNumber,
          ),
          state: next,
          options: [S.bookAnother],
          inputType: "none",
          appointment: serializeAppointment(inserted),
        };
      } catch {
        return reply(state, S.errSave, "ask_datetime", "datetime", true);
      }
    }

    case "done":
    case "confirm":
    default:
      return greet(lang);
  }
}

function greet(lang: Lang): ChatbotResponse {
  return {
    reply: pick(lang).welcome,
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
  isError = false,
): ChatbotResponse {
  return {
    reply: text,
    state: { ...state, step },
    options: [],
    inputType,
    isError,
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
