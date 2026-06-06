import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "renderer/components/header";
import { version } from "../../../package.json";

export function HomeScreen() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("Type 'help' to get started.");
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  useEffect(() => {
    focusInput();
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const command = input.trim().toLowerCase();

    if (!command) {
      return;
    }

    if (command === "pp home") {
      navigate("/player");
      return;
    }

    if (command === "pp exit") {
      setMessage("Você já está na janela inicial.");
      setInput("");
      requestAnimationFrame(focusInput);
      return;
    }

    if (command === "pp quit") {
      window.App.quit();
      return;
    }

    if (command === "help") {
      setMessage("Type 'pp home' to open the player.");
      setInput("");
      requestAnimationFrame(focusInput);
      return;
    }

    setMessage(`[ERROR] Unknown command: ${input.trim()}`);
    setInput("");
    requestAnimationFrame(focusInput);
  };

  return (
    <>
      <Header />
      <main
        className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-6"
        onPointerDown={focusInput}
      >
        <section className="w-full max-w-3xl font-mono">
          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="font-semibold text-2xl text-terminal-white">
                Prompt Play v{version}
              </h1>
              <p className="text-terminal-gray">
                Não é um terminal. É um player.
              </p>
              <div className="space-y-2 text-terminal-white/80 mt-5">
                <p>Available sources</p>
                <div className="grid gap-1">
                  <p>
                    <span className="text-terminal-cyan">radio</span>
                    <span className="ml-6">- Listen to FM and web radios</span>
                  </p>
                  <p>
                    <span className="text-terminal-cyan">yt</span>
                    <span className="ml-13.5">
                      - Listen to YouTube playlists
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p
                className={
                  message.startsWith("[ERROR]")
                    ? "text-terminal-red"
                    : "text-terminal-cyan"
                }
              >
                {message}
              </p>

              <form className="flex items-center gap-2" onSubmit={handleSubmit}>
                <span className="text-terminal-green">pp</span>
                <span className="text-terminal-green">&gt;</span>
                <input
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-terminal-white caret-terminal-green outline-none"
                  onChange={(event) => setInput(event.target.value)}
                  onPointerDown={focusInput}
                  placeholder="radio"
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
