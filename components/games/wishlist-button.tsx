"use client";
import { useActionState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  CheckCheck,
  LoaderCircle,
  X,
} from "lucide-react";
import { setWishlistGame } from "@/lib/wishlist-actions";
import { Button } from "@/components/ui/button";
import { unreleasedMessage } from "@/lib/game-release";

export function WishlistButton({
  gameId,
  initialWanted,
  compact = false,
  unreleased = false,
}: {
  gameId: number;
  initialWanted: boolean;
  compact?: boolean;
  unreleased?: boolean;
}) {
  const [state, action, pending] = useActionState(setWishlistGame, {
    wanted: initialWanted,
    error: false,
    message: null,
  });
  return (
    <div
      className={`wishlist-controls${compact ? " wishlist-controls-compact" : ""}`}
      aria-busy={pending}
    >
      {compact && state.wanted ? (
        <form action={action}>
          <input type="hidden" name="gameId" value={gameId} />
          <input type="hidden" name="wishlistIntent" value="played" />
          <Button type="submit" disabled={pending || unreleased}>
            {pending ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <CheckCheck size={16} />
            )}
            Przenieś do ogranych
          </Button>
        </form>
      ) : null}
      <form action={action}>
        <input type="hidden" name="gameId" value={gameId} />
        <input
          type="hidden"
          name="wishlistIntent"
          value={state.wanted ? "remove" : "add"}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          aria-pressed={state.wanted}
          aria-label={
            state.wanted
              ? "Usuń z listy Chcę zagrać"
              : "Dodaj do listy Chcę zagrać"
          }
        >
          {pending ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : compact ? (
            <X size={16} />
          ) : state.wanted ? (
            <BookmarkCheck size={16} />
          ) : (
            <Bookmark size={16} />
          )}
          {compact && state.wanted ? "Usuń z listy" : "Chcę zagrać"}
        </Button>
      </form>
      {!compact ? (
        <p className="played-hint">
          {state.wanted
            ? "Na Twojej liście planowanych gier."
            : "Zachowaj tę grę na później."}
        </p>
      ) : null}
      {compact && unreleased ? (
        <p className="played-hint">{unreleasedMessage}</p>
      ) : null}
      {state.message ? (
        <p
          className={
            state.error ? "played-feedback is-error" : "played-feedback"
          }
          role={state.error ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
