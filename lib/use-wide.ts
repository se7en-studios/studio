import { useEffect, useState } from "react";

/** true desde 768 px (breakpoint md). Falso en el primer render para no desincronizar la hidratación. */
export function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}
