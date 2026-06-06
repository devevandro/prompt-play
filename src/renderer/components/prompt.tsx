type PromptProps = {
  text: string;
};

export function Prompt({ text }: PromptProps) {
  return <span className="text-terminal-cyan">{text}</span>;
}
