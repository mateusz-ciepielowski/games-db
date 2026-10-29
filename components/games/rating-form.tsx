"use client";
import { useActionState, useId } from "react";
import { LoaderCircle, Star } from "lucide-react";
import { setGameRating } from "@/lib/played-game-actions";
import { Button } from "@/components/ui/button";

export function RatingForm({
  gameId,
  initialRating,
}: {
  gameId: number;
  initialRating: number | null;
}) {
  const id = useId();
  const [state, action, pending] = useActionState(setGameRating, {
    rating: initialRating,
    message: null,
    error: false,
  });
  return (
    <form action={action} className="personal-rating-form">
      <input type="hidden" name="gameId" value={gameId} />
      <p className="personal-rating-value">
        <Star size={15} fill={state.rating == null ? "none" : "currentColor"} />
        <span>
          Twoja ocena:{" "}
          <strong>
            {state.rating == null ? "brak oceny" : `${state.rating} / 10`}
          </strong>
        </span>
      </p>
      <label htmlFor={id} className="sr-only">
        Twoja ocena gry w skali od 1 do 10
      </label>
      <div className="personal-rating-fields">
        <select
          id={id}
          name="rating"
          defaultValue={state.rating ?? ""}
          required
          disabled={pending}
          aria-describedby={state.message ? `${id}-message` : undefined}
        >
          <option value="" disabled>
            Wybierz ocenę
          </option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} / 10
            </option>
          ))}
        </select>
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          aria-label="Zapisz swoją ocenę"
        >
          {pending ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            "Zapisz"
          )}
        </Button>
      </div>
      {state.message ? (
        <p
          id={`${id}-message`}
          className={`played-feedback${state.error ? " is-error" : ""}`}
          role={state.error ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
