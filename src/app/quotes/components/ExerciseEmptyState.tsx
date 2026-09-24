import { EmptyState } from "@/components/ui/Feedback";

export function ExerciseEmptyState({
  year,
  kind = "donnee",
  adminHint = false,
  description,
}: {
  year: number;
  kind?: "donnee" | "echeancier";
  adminHint?: boolean;
  description?: string;
}) {
  const title =
    kind === "echeancier"
      ? `Aucun échéancier pour l'exercice ${year}`
      : `Aucune donnée pour l'exercice ${year}`;

  return (
    <EmptyState
      title={title}
      description={
        description ??
        (adminHint
          ? "La retarification se fait via « Ajouter un exercice » ou le recalcul du millésime."
          : undefined)
      }
    />
  );
}
