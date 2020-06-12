import {
  existsSync,
  readFileStrSync,
} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as entry from "./entry.ts";
import { tauriDir, appDir } from "./helpers/app-paths.ts";
import logger from "./helpers/logger.ts";
import onShutdown from "./helpers/on-shutdown.ts";
import { spawn } from "./helpers/spawn.ts";
import { TauriConfig } from "./types/config.ts";

const log = logger("app:tauri");
const warn = logger("app:tauri (runner)", "red");

class Runner {
  pid: number;
  devPath?: string;
  killPromise?: Function;
  ranBeforeDevCommand?: boolean;

  constructor() {
    this.pid = 0;
    onShutdown(() => {
      this.stop().catch((e) => {
        throw e;
      });
    });
  }

  async run(cfg: TauriConfig): Promise<void> {
    let devPath = cfg.build.devPath;

    if (this.pid) {
      if (this.devPath !== devPath) {
        await this.stop();
      }
    }

    if (!this.ranBeforeDevCommand && cfg.build.beforeDevCommand) {
      this.ranBeforeDevCommand = true; // prevent calling it twice on recursive call on our watcher
      log("Running `" + cfg.build.beforeDevCommand + "`");
      const cmd = cfg.build.beforeDevCommand.split(" ");
      spawn(cmd[0], cmd.slice(1), appDir, (error: any) => {
        if (error) {
          Deno.exit(1);
        }
      });
    }

    entry.generate(tauriDir, cfg);

    let inlinedAssets: string[] = [];

    Deno.env.set("TAURI_INLINED_ASSSTS", inlinedAssets.join("|"));

    this.devPath = devPath;

    const startDevTauri = async (): Promise<void> => {
      return await this.__runCargoCommand({
        cargoArgs: ["run"],
        dev: true,
        exitOnPanic: cfg.ctx.exitOnPanic,
      });
    };

    return startDevTauri();
  }

  async build(cfg: TauriConfig): Promise<void> {
    if (cfg.build.beforeBuildCommand) {
      const [command, ...args] = cfg.build.beforeBuildCommand.split(" ");
      await spawn(command, args, appDir);
    }

    entry.generate(tauriDir, cfg);

    const inlinedAssets =
      (await this.__parseHtml(cfg, cfg.build.distDir)).inlinedAssets;
    Deno.env.set("TAURI_INLINED_ASSSTS", inlinedAssets.join("|"));

    const features = [
      cfg.tauri.embeddedServer.active ? "embedded-server" : "no-server",
    ];

    const buildFn = async (target?: string): Promise<void> =>
      await this.__runCargoCommand({
        cargoArgs: [
          cfg.tauri.bundle.active ? "tauri-bundler" : "build",
          "--features",
          ...features,
          ...(
            cfg.tauri.bundle.active &&
            Array.isArray(cfg.tauri.bundle.targets) &&
            cfg.tauri.bundle.targets.length
              ? ["--format"].concat(cfg.tauri.bundle.targets)
              : []
          ),
        ]
          .concat(cfg.ctx.debug ? [] : ["--release"])
          .concat(target ? ["--target", target] : []),
      });

    if (!cfg.ctx.target) {
      // if no target specified,
      // build only for the current platform
      await buildFn();
    } else {
      const targets = cfg.ctx.target.split(",");

      for (const target of targets) {
        await buildFn(target);
      }
    }
  }

  async __parseHtml(
    cfg: TauriConfig,
    indexDir: string,
  ): Promise<{ inlinedAssets: string[]; html: string }> {
    const inlinedAssets: string[] = [];

    return await new Promise((resolve, reject) => {
      const indexPath = path.join(indexDir, "index.html");
      if (!existsSync(indexPath)) {
        warn(
          `Error: cannot find index.html in "${indexDir}". Did you forget to build your web code or update the build.distDir in tauri.conf.json?`,
        );
        reject(new Error("Could not find index.html in dist dir."));
      }
      const originalHtml = readFileStrSync(indexPath).toString();

      resolve({ inlinedAssets, html: originalHtml });
    });
  }

  async stop(): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.__stopCargo()
        .then(resolve)
        .catch(reject);
    });
  }

  async __runCargoCommand({
    cargoArgs,
    extraArgs,
    dev = false,
    exitOnPanic = true,
  }: {
    cargoArgs: string[];
    extraArgs?: string[];
    dev?: boolean;
    exitOnPanic?: boolean;
  }): Promise<void> {
    return await new Promise((resolve, reject) => {
      this.pid = spawn(
        "cargo",
        extraArgs ? cargoArgs.concat(["--"]).concat(extraArgs) : cargoArgs,
        tauriDir,
        (code: number, pid: number) => {
          if (this.killPromise) {
            this.killPromise();
            this.killPromise = undefined;
            resolve();
            return;
          }

          if (pid !== this.pid) {
            resolve();
            return;
          }

          if (dev && !exitOnPanic && code === 101) {
            resolve();
            return;
          }

          if (code) {
            warn();
            warn("⚠️  [FAIL] Cargo CLI has failed");
            warn();
            reject(
              new Error("Cargo failed with status code " + code.toString()),
            );
            Deno.exit(1);
          } else if (!dev) {
            resolve();
          }

          if (dev) {
            warn();
            warn("Cargo process was killed. Exiting...");
            warn();
            Deno.exit(0);
          }

          resolve();
        },
      );

      if (dev) {
        resolve();
      }
    });
  }

  async __stopCargo(): Promise<void> {
    if (!this.pid) {
      return await Promise.resolve();
    }

    log("Shutting down tauri process...");

    return await new Promise((resolve, reject) => {
      this.killPromise = resolve;
      try {
        Deno.kill(this.pid, Deno.Signal.SIGINT);
        this.pid = 0;
      } catch (e) {
        reject(e);
      }
    });
  }
}

export default Runner;
