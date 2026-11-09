export interface ToastMessage {
  id: string;
  text: string;
}

interface ToastStackProps {
  messages: readonly ToastMessage[];
}

/** Presentational toast list. The owner decides what to show and when to remove it. */
export function ToastStack({ messages }: ToastStackProps) {
  return (
    <div className="pip-toasts" role="status" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id} className="pip-toast">
          {m.text}
        </div>
      ))}
    </div>
  );
}
