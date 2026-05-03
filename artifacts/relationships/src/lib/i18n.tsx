import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "am";

const STORAGE_KEY = "appt_lang";

type Dict = Record<string, { en: string; am: string }>;

export const dict: Dict = {
  // Chatbot header
  bookAppointment: {
    en: "Book an appointment",
    am: "ቀጠሮ ይያዙ",
  },
  guideTagline: {
    en: "I'll guide you through it in under a minute",
    am: "በደቂቃ ውስጥ እመራዎታለሁ",
  },
  manager: { en: "Manager", am: "አስተዳዳሪ" },
  poweredBy: {
    en: "Powered by an AI booking assistant",
    am: "በ AI የቀጠሮ ረዳት የተጎላ",
  },
  needAnother: { en: "Need to book another?", am: "ሌላ ቀጠሮ ይያዛሉ?" },
  startOver: { en: "Start over", am: "እንደገና ጀምር" },
  typeReply: { en: "Type your reply...", am: "መልስዎን ይተይቡ..." },
  tapOption: {
    en: "Tap an option above or type a name",
    am: "ከላይ አማራጭ ይጫኑ ወይም ስም ይተይቡ",
  },
  pickDateTime: { en: "Pick a date and time", am: "ቀንና ሰዓት ይምረጡ" },

  // Admin login
  managerSignIn: { en: "Manager sign in", am: "የአስተዳዳሪ መግቢያ" },
  accessDashboard: {
    en: "Access the appointment dashboard",
    am: "የቀጠሮ ዳሽቦርድን ይድረሱ",
  },
  username: { en: "Username", am: "የተጠቃሚ ስም" },
  password: { en: "Password", am: "የይለፍ ቃል" },
  signIn: { en: "Sign in", am: "ግባ" },
  signingIn: { en: "Signing in...", am: "በመግባት ላይ..." },
  backToChatbot: { en: "← Back to chatbot", am: "← ወደ ቻትቦት ተመለስ" },

  // Admin dashboard
  appointmentsTitle: { en: "Appointment Dashboard", am: "የቀጠሮ ዳሽቦርድ" },
  signedInAs: { en: "Signed in as", am: "የገባው፦" },
  openChatbot: { en: "Open chatbot", am: "ቻትቦት ክፈት" },
  signOut: { en: "Sign out", am: "ውጣ" },
  allAppointments: { en: "All appointments", am: "ሁሉም ቀጠሮዎች" },
  clearSearch: { en: "Clear search", am: "ፍለጋን አጽዳ" },
  result: { en: "result for", am: "ውጤት ለ" },
  results: { en: "results for", am: "ውጤቶች ለ" },
  forLabel: { en: "", am: "" },
  allStaff: { en: "All staff", am: "ሁሉም ሐኪሞች" },
  allStatuses: { en: "All statuses", am: "ሁሉም ሁኔታዎች" },
  contact: { en: "Contact", am: "ያግኙት" },
  deleteConfirmDesc: {
    en: "This permanently removes the booking. This cannot be undone.",
    am: "ይህ ቀጠሮውን በቋሚነት ያስወግዳል። ተመልሶ መመለስ አይቻልም።",
  },
  searchAndFilter: {
    en: "Search and filter stored customers",
    am: "የተከማቹ ደንበኞችን ይፈልጉና ያጣሩ",
  },
  searchPlaceholder: {
    en: "Search customer name, phone, address...",
    am: "ስም፣ ስልክ፣ አድራሻ ይፈልጉ...",
  },
  search: { en: "Search", am: "ፈልግ" },
  showing: { en: "Showing", am: "በማሳየት ላይ" },
  resultsFor: { en: "result(s) for", am: "ውጤት ለ" },
  staff: { en: "Staff", am: "ሐኪም" },
  date: { en: "Date", am: "ቀን" },
  status: { en: "Status", am: "ሁኔታ" },
  all: { en: "All", am: "ሁሉም" },
  pending: { en: "Pending", am: "በመጠባበቅ" },
  confirmed: { en: "Confirmed", am: "የተረጋገጠ" },
  completed: { en: "Completed", am: "የተጠናቀቀ" },
  cancelled: { en: "Cancelled", am: "የተሰረዘ" },
  clearFilters: { en: "Clear filters", am: "አጣሮችን አጽዳ" },
  total: { en: "Total", am: "ጠቅላላ" },
  upcoming: { en: "Upcoming", am: "የሚመጣ" },
  confirm: { en: "Confirm", am: "አረጋግጥ" },
  complete: { en: "Complete", am: "አጠናቅቅ" },
  cancel: { en: "Cancel", am: "ሰርዝ" },
  delete: { en: "Delete", am: "አጥፋ" },
  customer: { en: "Customer", am: "ደንበኛ" },
  phone: { en: "Phone", am: "ስልክ" },
  reason: { en: "Reason", am: "ምክንያት" },
  when: { en: "When", am: "መቼ" },
  actions: { en: "Actions", am: "ድርጊቶች" },
  noAppointments: {
    en: "No appointments match these filters yet.",
    am: "ከእነዚህ አጣሮች ጋር የሚስማማ ቀጠሮ የለም።",
  },
  deleteConfirm: {
    en: "Delete this appointment?",
    am: "ይህን ቀጠሮ ይሰርዙ?",
  },
  yes: { en: "Yes, delete", am: "አዎ፣ ሰርዝ" },
  no: { en: "Cancel", am: "ተወው" },

  // Email / chatbot
  email: { en: "Email", am: "ኢሜይል" },
  typeEmail: { en: "your@email.com", am: "your@email.com" },

  // Patients tab
  patients: { en: "Patients", am: "ታካሚዎች" },
  patientsDesc: { en: "All registered patients and their appointment history", am: "ሁሉም ተመዝጋቢ ታካሚዎች እና የቀጠሮ ታሪካቸው" },
  appointments: { en: "Appointments", am: "ቀጠሮዎች" },
  appointmentsTab: { en: "Appointments", am: "ቀጠሮዎች" },
  patientsTab: { en: "Patients", am: "ታካሚዎች" },
  noPatients: { en: "No patients registered yet.", am: "ምንም ታካሚ አልተመዘገበም።" },
  history: { en: "History", am: "ታሪክ" },
  lastVisit: { en: "Last visit", am: "የመጨረሻ ጉብኝት" },
  totalVisits: { en: "Total visits", am: "ጠቅላላ ጉብኝቶች" },
  viewHistory: { en: "View history", am: "ታሪክ ይመልከቱ" },
  hideHistory: { en: "Hide history", am: "ታሪክ ደብቅ" },
  noEmail: { en: "No email", am: "ኢሜይል የለም" },

  // Files tab
  filesTab: { en: "Files", am: "ፋይሎች" },
  filesDesc: { en: "Upload and manage files for the clinic", am: "ለክሊኒኩ ፋይሎችን ይጫኑ እና ያስተዳድሩ" },
  uploadFile: { en: "Upload file", am: "ፋይል ጫን" },
  uploading: { en: "Uploading...", am: "በመጫን ላይ..." },
  noFiles: { en: "No files uploaded yet.", am: "ምንም ፋይል አልተጫነም።" },
  fileName: { en: "File name", am: "የፋይል ስም" },
  fileSize: { en: "Size", am: "መጠን" },
  uploadedAt: { en: "Uploaded", am: "የተጫነው" },
  download: { en: "Download", am: "አውርድ" },
  deleteFile: { en: "Delete file", am: "ፋይሉን ሰርዝ" },
  deleteFileConfirm: { en: "Delete this file?", am: "ይህን ፋይል ይሰርዙ?" },
  deleteFileDesc: { en: "This permanently removes the file. This cannot be undone.", am: "ፋይሉን በቋሚነት ያስወግዳል። ተመልሶ መመለስ አይቻልም።" },
  uploadError: { en: "Upload failed. Please try again.", am: "መጫን አልተሳካም። እባክዎ እንደገና ይሞክሩ።" },
  chooseFile: { en: "Choose a file", am: "ፋይል ይምረጡ" },
  orDragDrop: { en: "or drag and drop here", am: "ወይም እዚህ ይጎትቱ" },
  view: { en: "View", am: "አሳይ" },
  filePreview: { en: "File preview", am: "የፋይል ቅድመ እይታ" },
  selectFileToPreview: { en: "Select a file to preview it here.", am: "እዚህ ለማሳየት ፋይል ይምረጡ።" },
  previewUnavailable: { en: "Preview not available for this file type.", am: "ለዚህ የፋይል አይነት ቅድመ እይታ አይገኝም።" },
  type: { en: "Type", am: "አይነት" },
};

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict) => string;
  toggle: () => void;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "am" ? "am" : "en";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang === "am" ? "am" : "en";
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(
    () => setLangState((p) => (p === "en" ? "am" : "en")),
    [],
  );

  const t = useCallback(
    (key: keyof typeof dict) => dict[key]?.[lang] ?? dict[key]?.en ?? key,
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, toggle }),
    [lang, setLang, t, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, toggle } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md border bg-background hover:bg-muted transition-colors ${className}`}
      aria-label="Switch language"
      data-testid="button-lang-toggle"
    >
      <span>{lang === "en" ? "🇬🇧" : "🇪🇹"}</span>
      <span>{lang === "en" ? "EN" : "አማ"}</span>
    </button>
  );
}
