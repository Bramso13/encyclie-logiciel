import { useEffect, useState } from "react";

/** Affiche un indicateur seulement si `active` reste vrai plus de `delay` ms. */
export function useDelayedFlag(active: boolean, delay = 300): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);

  return visible;
}
