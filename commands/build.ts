import { parse } from "https://deno.land/std/flags/mod.ts";

const { args } = Deno;

export default () => {
  const cli = parse(args.slice(1), {
    alias: {
      h: "help",
      d: "debug",
      t: "target",
    },
    boolean: ["h", "d"],
  });

  if (cli.help) {
    console.log(`
      Description
        Tauri build.
      Usage
        $ tauri build
      Options
        --help, -h     Displays this message
        --debug, -d    Builds with the debug flag
    `);
    Deno.exit();
  }

  async function run() {
    const { default: build } = await import("../api/build.ts");

    await build({
      ctx: {
        debug: cli.debug,
      },
    }).promise;
  }

  run();
};
