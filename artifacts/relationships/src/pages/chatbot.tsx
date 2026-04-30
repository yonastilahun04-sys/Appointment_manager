import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Send, RotateCcw, ShieldCheck, CalendarCheck2 } from "lucide-react";
import { useChatbotMessage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import clinicBg from "@/assets/clinic-bg.png";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
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
          };
          setMessages((prev) => [
            ...prev,
            { id: uid(), from: "bot", text: r.reply },
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
              <MessageBubble key={m.id} from={m.from} text={m.text} />
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
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  inputType === "datetime"
                    ? "Pick a date and time"
                    : inputType === "choice"
                    ? "Tap an option above or type a name"
                    : "Type your reply..."
                }
                type={inputType === "datetime" ? "datetime-local" : "text"}
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

function MessageBubble({ from, text }: { from: "bot" | "user"; text: string }) {
  const isBot = from === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isBot
            ? "bg-muted text-foreground rounded-bl-sm"
            : "bg-indigo-600 text-white rounded-br-sm"
        }`}
        data-testid={`bubble-${from}`}
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
