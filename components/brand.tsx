import Link from "next/link";
import { Gamepad2 } from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="GamesDB — strona główna">
      <span className="brand-icon">
        <Gamepad2 size={23} strokeWidth={1.8} />
      </span>
      <span>
        games<span className="brand-light">db</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
