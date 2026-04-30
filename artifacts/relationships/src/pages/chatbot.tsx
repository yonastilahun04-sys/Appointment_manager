import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Send, RotateCcw, ShieldCheck, CalendarCheck2 } from "lucide-react";
import { useChatbotMessage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import clinicBg from "@/assets/clinic-bg.png";

const COUNTRY_CODES: Array<{ code: string; flag: string; name: string }> = [
  { code: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "+1", flag: "🇺🇸", name: "United States / Canada" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "+252", flag: "🇸🇴", name: "Somalia" },
  { code: "+253", flag: "🇩🇯", name: "Djibouti" },
  { code: "+249", flag: "🇸🇩", name: "Sudan" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
];

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
  isError?: boolean;
};

type BotState = {
  step: string;
  data: Record<string, string | null | undefined>;
};

const INITIAL_STATE: BotState = { step: "greeting", data: {} };

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<BotState>(INITIAL_STATE);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [inputType, setInputType] = useState<
    "text" | "datetime" | "choice" | "none"
  >("text");
  const [completed, setCompleted] = useState(false);
  const [countryCode, setCountryCode] = useState<string>("+251");

  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const chatbot = useChatbotMessage();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    sendTurn(undefined, INITIAL_STATE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, options]);

  function sendTurn(message: string | undefined, currentState: BotState) {
    chatbot.mutate(
      { data: { message, state: currentState } },
      {
        onSuccess: (res) => {
          const r = res as {
            reply: string;
            state: BotState;
            options: string[];
            inputType?: "text" | "datetime" | "choice" | "none";
            appointment?: unknown;
            isError?: boolean | null;
          };
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              from: "bot",
              text: r.reply,
              isError: r.isError ?? false,
            },
          ]);
          setState(r.state);
          setOptions(r.options ?? []);
          setInputType(r.inputType ?? "text");
          if (r.appointment) {
            setCompleted(true);
          }
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              from: "bot",
              text: "Sorry, something went wrong. Please try again.",
              isError: true,
            },
          ]);
        },
      },
    );
  }

  function submitText(text: string) {
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { id: uid(), from: "user", text: value }]);
    setInput("");
    sendTurn(value, state);
  }

  function submitDatetime(value: string) {
    if (!value) return;
    const date = new Date(value);
    const display = date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    setMessages((prev) => [...prev, { id: uid(), from: "user", text: display }]);
    setInput("");
    sendTurn(date.toISOString(), state);
  }

  function restart() {
    setMessages([]);
    setState(INITIAL_STATE);
    setOptions([]);
    setInputType("text");
    setCompleted(false);
    sendTurn(undefined, INITIAL_STATE);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputType === "datetime") {
      submitDatetime(input);
    } else if (state.step === "ask_phone") {
      const local = input.trim().replace(/^0+/, "");
      if (!local) return;
      submitText(`${countryCode} ${local}`);
    } else {
      submitText(input);
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{ backgroundImage: `url(${clinicBg})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-white/70 to-sky-50/85 dark:from-slate-950/85 dark:via-slate-900/80 dark:to-slate-950/85 backdrop-blur-[2px]" />
      <div className="relative mx-auto max-w-2xl px-4 py-8 flex flex-col h-screen">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-items-center">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight">
                Book an appointment
              </h1>
              <p className="text-xs text-muted-foreground">
                I'll guide you through it in under a minute
              </p>
            </div>
          </div>
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1">
              <ShieldCheck className="w-4 h-4" />
              Manager
            </Button>
          </Link>
        </header>

        <div className="flex-1 flex flex-col bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
            data-testid="chat-scroll"
          >
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                from={m.from}
                text={m.text}
                isError={m.isError}
              />
            ))}
            {chatbot.isPending && (
              <div className="flex">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <Dot delay="0ms" />
                    <Dot delay="150ms" />
                    <Dot delay="300ms" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {options.length > 0 && (
            <div className="border-t p-3 flex flex-wrap gap-2 bg-muted/30">
              {options.map((opt) => (
                <Button
                  key={opt}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (opt.toLowerCase().startsWith("book another")) {
                      restart();
                    } else {
                      submitText(opt);
                    }
                  }}
                  data-testid={`option-${opt}`}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {!completed && inputType !== "none" && (
            <form
              onSubmit={handleSubmit}
              className="border-t p-3 flex items-center gap-2 bg-card"
            >
              {state.step === "ask_phone" && (
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger
                    className="w-[110px] shrink-0"
                    data-testid="select-country-code"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.code + c.name} value={c.code}>
                        <span className="mr-1">{c.flag}</span>
                        {c.code}
                        <span className="ml-2 text-muted-foreground text-xs">
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  inputType === "datetime"
                    ? "Pick a date and time"
                    : state.step === "ask_phone"
                    ? "911 223344"
                    : inputType === "choice"
                    ? "Tap an option above or type a name"
                    : "Type your reply..."
                }
                type={
                  inputType === "datetime"
                    ? "datetime-local"
                    : state.step === "ask_phone"
                    ? "tel"
                    : "text"
                }
                inputMode={state.step === "ask_phone" ? "tel" : undefined}
                disabled={chatbot.isPending}
                data-testid="input-message"
                autoFocus
              />
              <Button
                type="submit"
                size="icon"
                disabled={chatbot.isPending || !input.trim()}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}

          {completed && (
            <div className="border-t p-3 flex items-center justify-between bg-muted/30">
              <span className="text-sm text-muted-foreground">
                Need to book another?
              </span>
              <Button onClick={restart} size="sm" className="gap-1">
                <RotateCcw className="w-4 h-4" />
                Start over
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-3">
          Powered by an AI booking assistant
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  from,
  text,
  isError,
}: {
  from: "bot" | "user";
  text: string;
  isError?: boolean;
}) {
  const isBot = from === "bot";
  const botStyle = isError
    ? "bg-red-50 text-red-700 border border-red-200 rounded-bl-sm dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
    : "bg-muted text-foreground rounded-bl-sm";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isBot ? botStyle : "bg-indigo-600 text-white rounded-br-sm"
        }`}
        data-testid={`bubble-${from}${isError ? "-error" : ""}`}
      >
        {text}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
