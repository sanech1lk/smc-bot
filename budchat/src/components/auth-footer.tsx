import Link from "next/link";

export function AuthFooter() {
  return (
    <p className="mt-6 text-center text-xs leading-relaxed text-text-muted">
      Продолжая, вы принимаете{" "}
      <Link href="/legal/terms" className="underline hover:text-text-secondary">
        условия использования
      </Link>{" "}
      и{" "}
      <Link href="/legal/privacy" className="underline hover:text-text-secondary">
        политику конфиденциальности
      </Link>
      .
    </p>
  );
}
