"use client";

import { useSyncExternalStore } from "react";
import { soundFx } from "@/lib/sound-fx";

const noopSubscribe = () => () => {};

export function useSoundFx() {
  const enabled = useSyncExternalStore(
    (cb) => soundFx.subscribe(cb),
    () => soundFx.enabled,
    () => false // servidor por defecto apagado para hidratación perfecta
  );

  return {
    enabled,
    toggle: () => soundFx.toggle(),
    click: () => soundFx.click(),
    pop: () => soundFx.pop(),
    tick: () => soundFx.tick(),
    success: () => soundFx.success(),
  };
}

