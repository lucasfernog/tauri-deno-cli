import { TauriConfig } from "../types/index.ts";
import Runner from "../runner.ts";
import getTauriConfig from "../helpers/tauri-config.ts";

interface BuildResult {
  promise: Promise<void>;
  runner: Runner;
}

export default (config: TauriConfig): BuildResult => {
  const tauri = new Runner();
  const tauriConfig = getTauriConfig(
    Object.assign(
      {
        ctx: {
          prod: true,
        },
      },
      config,
    ),
  );

  return {
    runner: tauri,
    promise: tauri.build(tauriConfig),
  };
};
