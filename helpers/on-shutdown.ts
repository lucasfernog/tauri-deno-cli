import { signal } from "https://deno.land/std/signal/mod.ts";

const sig = signal(
  Deno.Signal.SIGINT,
  Deno.Signal.SIGTERM,
  Deno.Signal.SIGHUP,
);

export default async (fn: () => void): Promise<void> => {
  const cleanup = (): void => {
    try {
      fn();
    } finally {
      Deno.exit();
    }
  };
  for await (const _ of sig) {
    cleanup();
  }
};
