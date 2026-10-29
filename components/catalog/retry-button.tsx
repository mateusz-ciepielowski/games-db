"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="catalog-text-link"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Ponawianie…" : "Spróbuj ponownie"}
      {pending ? (
        <LoaderCircle size={15} className="animate-spin" />
      ) : (
        <ArrowRight size={15} />
      )}
    </button>
  );
}
