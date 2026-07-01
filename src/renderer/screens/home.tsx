import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "renderer/components/Header";
import { version } from "../../../package.json";
import { Prompt } from "renderer/components/prompt";

interface HomeHistoryLine {
  id: string;
  text: string;
}

export function HomeScreen() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HomeHistoryLine[]>([
    { id: "boot-version", text: `[INFO] v${version}` },
    {
      id: "boot-ready",
      text: "[INFO] Operate your audio like a UNIX terminal",
    },
    { id: "boot-ready", text: "[READY] prompt play initialized" },
    {
      id: "boot-hint",
      text: "[HINT] Type 'music', 'radio', 'help', or 'quit'",
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const addToHistory = useCallback((line: string) => {
    setHistory((prev) => [
      ...prev.slice(-20),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        text: line,
      },
    ]);
  }, []);

  useEffect(() => {
    focusInput();
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const command = input.trim().toLowerCase();

    if (!command) {
      return;
    }

    if (command === "music") {
      addToHistory("$ music");
      setInput("");
      navigate("/player?source=local");
      return;
    }

    if (command === "radio" || command === "fm") {
      addToHistory(`$ ${command}`);
      setInput("");
      navigate("/player?source=radio");
      return;
    }

    if (command === "exit") {
      addToHistory("$ exit");
      addToHistory("[INFO] Already on first access");
      setInput("");
      requestAnimationFrame(focusInput);
      return;
    }

    if (command === "quit") {
      window.App.quit();
      return;
    }

    if (command === "help") {
      addToHistory("$ help");
      addToHistory("[HELP] Type 'music' for local files");
      addToHistory("[HELP] Type 'radio' or 'fm' for streams");
      addToHistory("[HELP] Use '+' or '-' for volume inside the player");
      setInput("");
      requestAnimationFrame(focusInput);
      return;
    }

    addToHistory(`$ ${input.trim()}`);
    addToHistory(`[ERROR] Unknown command: ${input.trim()}`);
    setInput("");
    requestAnimationFrame(focusInput);
  };

  return (
    <>
      <Header title="prompt-play:/home" />
      <main
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4"
        onPointerDown={focusInput}
      >
        <section className="w-full max-w-3xl font-mono">
          <div className="border border-terminal-green/30 bg-background shadow-2xl">
            <div className="border-terminal-green/20 border-b px-4 py-2 text-terminal-gray text-xs">
              prompt-play:/home
            </div>
            <div className="min-h-96 space-y-2 px-4 py-4 text-sm">
              <div className="home-computer-title pb-4 text-terminal-cyan text-xl sm:text-4xl uppercase">
                Prompt Play
              </div>
              {history.map((line) => (
                <p
                  className={
                    line.text.startsWith("[ERROR]")
                      ? "text-terminal-red"
                      : line.text.startsWith("[HINT]") ||
                          line.text.startsWith("[HELP]")
                        ? "text-terminal-cyan"
                        : line.text.startsWith("[OK]")
                          ? "text-terminal-green"
                          : "text-terminal-white"
                  }
                  key={line.id}
                >
                  {line.text}
                </p>
              ))}

              <form className="flex items-center gap-2" onSubmit={handleSubmit}>
                <Prompt text="home" />
                <Prompt text=">" />
                <input
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-terminal-white caret-terminal-green outline-none placeholder:text-terminal-gray"
                  onChange={(event) => setInput(event.target.value)}
                  onPointerDown={focusInput}
                  placeholder="music | radio"
                  ref={inputRef}
                  spellCheck={false}
                  value={input}
                />
              </form>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
