"use client";
import { useActionState } from "react";
import { Check, LoaderCircle, Plus } from "lucide-react";
import { setPlayedGame } from "@/lib/played-game-actions";
import { Button } from "@/components/ui/button";
import { RatingForm } from "./rating-form";
import { unreleasedMessage } from "@/lib/game-release";

export function PlayedButton({
  gameId,
  initialPlayed,
  compact = false,
  initialRating = null,
  unreleased = false,
}: {
  gameId: number;
  initialPlayed: boolean;
  compact?: boolean;
  initialRating?: number | null;
  unreleased?: boolean;
}) {
  const [state, action, pending] = useActionState(setPlayedGame, {
    played: initialPlayed,
    error: false,
    message: null,
  });
  return (
    <div className="played-controls">
      <form
        action={action}
        className={`played-form${compact ? " played-form-compact" : ""}`}
      >
        <input type="hidden" name="gameId" value={gameId} />
        <input type="hidden" name="played" value={String(!state.played)} />
        <Button
          type="submit"
          variant={state.played ? "outline" : "default"}
          className={`played-button${state.played ? " is-played" : ""}`}
          disabled={pending || (unreleased && !state.played)}
          aria-pressed={state.played}
          aria-label={state.played ? "Usuń z ogranych" : "Oznacz jako ograne"}
          title={
            state.played
              ? "Kliknij, aby usunąć z ogranych"
              : "Dodaj do ogranych"
          }
        >
          {pending ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : state.played ? (
            <Check size={17} />
          ) : (
            <Plus size={17} />
          )}
          {pending ? "Zapisywanie…" : "Ograne"}
        </Button>
        {!compact ? (
          <p className="played-hint">
            {state.played
              ? "Na Twojej liście. Kliknij, aby cofnąć oznaczenie."
              : "Zapisz tę grę na swojej liście ogranych."}
          </p>
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
      </form>
      {unreleased ? <p className="played-hint">{unreleasedMessage}</p> : null}
      {state.played && !unreleased ? (
        <RatingForm
          key={`${gameId}:${initialRating}`}
          gameId={gameId}
          initialRating={initialRating}
        />
      ) : null}
    </div>
  );
}
