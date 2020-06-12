import {
  ensureDirSync,
  writeFileStrSync,
  readFileStrSync,
} from "https://deno.land/std/fs/mod.ts";
import { template } from "https://deno.land/x/lodash@4.17.7-es/lodash.js";
import * as path from "https://deno.land/std/path/mod.ts";
import { TauriConfig } from "./types/config.ts";
import { __ } from "https://deno.land/x/dirname/mod.ts";
const { __dirname } = __(import.meta);

export const generate = (outDir: string, cfg: TauriConfig): void => {
  // this MUST be from the templates repo
  const apiTemplate = readFileStrSync(
    path.resolve(__dirname, "./templates/tauri.js"),
  );
  const compiledApi = template(apiTemplate);

  ensureDirSync(outDir);
  writeFileStrSync(path.join(outDir, "tauri.js"), compiledApi(cfg));
};
