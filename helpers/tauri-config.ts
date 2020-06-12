import {
  existsSync,
  readJsonSync,
} from "https://deno.land/std/fs/mod.ts";
import { TauriConfig } from "../types/index.ts";
import logger from "../helpers/logger.ts";
import * as appPaths from "./app-paths.ts";

const error = logger("ERROR:", "red");

const getTauriConfig = (
  cfg: Partial<TauriConfig>,
): TauriConfig => {
  const pkgPath = appPaths.resolve.app("package.json");
  const tauriConfPath = appPaths.resolve.tauri("tauri.conf.json");
  if (!existsSync(pkgPath)) {
    error("Could not find a package.json in your app's directory.");
    Deno.exit(1);
  }
  if (!existsSync(tauriConfPath)) {
    error(
      "Could not find a tauri config (tauri.conf.json) in your app's directory.",
    );
    Deno.exit(1);
  }
  const tauriConf = readJsonSync(tauriConfPath) as TauriConfig;
  const pkg = readJsonSync(pkgPath) as { productName: string };

  const config = Object.assign(
    {
      build: {},
      ctx: {},
      tauri: {
        embeddedServer: {
          active: true,
        },
        bundle: {
          active: true,
          icon: [],
          resources: [],
          externalBin: [],
          deb: {
            depends: [],
          },
          osx: {
            frameworks: [],
          },
        },
        whitelist: {
          all: false,
        },
        window: {
          title: pkg.productName,
        },
        security: {
          csp:
            "default-src blob: data: filesystem: ws: http: https: 'unsafe-eval' 'unsafe-inline'",
        },
        edge: {
          active: true,
        },
        inliner: {
          active: true,
        },
      },
    } as any,
    tauriConf as any,
    cfg as any,
  ) as TauriConfig;

  if (!config.build.devPath || !config.build.distDir) {
    error(
      "Missing required build configuration in your tauri.conf.json file. Please make sure to add the proper path configuration as described at https://github.com/tauri-apps/tauri/wiki/05.-Tauri-Integration#src-tauritauriconfjson.",
    );
    Deno.exit(1);
  }

  const runningDevServer = config.build.devPath?.startsWith("http");
  if (!runningDevServer) {
    config.build.devPath = appPaths.resolve.tauri(config.build.devPath);
    Deno.env.set("TAURI_DIST_DIR", config.build.devPath);
  }
  if (config.build.distDir) {
    config.build.distDir = appPaths.resolve.tauri(config.build.distDir);
    Deno.env.set("TAURI_DIST_DIR", config.build.distDir);
  }

  // bundle configuration
  if (config.tauri.bundle) {
    // OSX
    if (config.tauri.bundle.osx) {
      const license = config.tauri.bundle.osx.license;
      if (typeof license === "string") {
        config.tauri.bundle.osx.license = appPaths.resolve.tauri(license);
      } else if (license !== null) {
        const licensePath = appPaths.resolve.app("LICENSE");
        if (existsSync(licensePath)) {
          config.tauri.bundle.osx.license = licensePath;
        }
      }
    }

    // targets
    if (Array.isArray(config.tauri.bundle.targets)) {
      if (Deno.build.os !== "windows") {
        config.tauri.bundle.targets = config.tauri.bundle.targets.filter((t) =>
          t !== "msi"
        );
      }
    }
  }

  if (!Deno.env.get("TAURI_DIST_DIR")) {
    error(
      "Couldn't resolve the dist dir. Make sure you have `devPath` or `distDir` under tauri.conf.json > build",
    );
    Deno.exit(1);
  }

  Deno.env.set("TAURI_DIR", appPaths.tauriDir);
  Deno.env.set("TAURI_CONFIG", JSON.stringify(config));

  return config;
};

export default getTauriConfig;
