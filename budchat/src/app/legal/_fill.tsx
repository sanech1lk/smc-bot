/**
 * Marks a value only the operator can supply — their own name, address or
 * contact email. Rendered loud on purpose: a placeholder that ships to
 * production must be impossible to miss, and a privacy policy naming the
 * wrong person is worse than one that is obviously unfinished.
 */
export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-status-yellow/20 px-1.5 py-0.5 font-semibold text-status-yellow">
      [ЗАПОЛНИТЬ: {children}]
    </span>
  );
}
