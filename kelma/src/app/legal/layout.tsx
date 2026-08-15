import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 py-8">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={16} />
        Назад
      </Link>
      <article className="prose-kelma space-y-4 text-text-secondary [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-text-primary [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text-primary [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-text-primary [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text-primary">
        {children}
      </article>
    </div>
  );
}
