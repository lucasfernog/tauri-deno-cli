import { existsSync } from "https://deno.land/std/fs/mod.ts";
import {
  join,
  normalize,
  resolve,
  sep,
  isAbsolute,
} from "https://deno.land/std/path/mod.ts";
import logger from "./logger.ts";

const warn = logger("tauri", "red");

function resolvePath(basePath: string, dir: string): string {
  return dir && isAbsolute(dir) ? dir : resolve(basePath, dir);
}

const getAppDir = (): string => {
  let dir = Deno.cwd();
  let count = 0;

  // only go up three folders max
  while (dir.length > 0 && !dir.endsWith(sep) && count <= 2) {
    if (existsSync(join(dir, "src-tauri", "tauri.conf.json"))) {
      return dir;
    }
    count++;
    dir = normalize(join(dir, ".."));
  }

  warn(
    "Couldn't find recognize the current folder as a part of a Tauri project",
  );
  Deno.exit(1);
};

const appDir = getAppDir();
const tauriDir = resolve(appDir, "src-tauri");

const resolveDir = {
  app: (dir: string) => resolvePath(appDir, dir),
  tauri: (dir: string) => resolvePath(tauriDir, dir),
};

export { appDir, tauriDir, resolveDir as resolve };
