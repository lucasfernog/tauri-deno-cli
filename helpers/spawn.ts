import logger from "./logger.ts";

const log = logger("app:spawn");
const warn = logger("app:spawn", "red");

/*
  Returns pid, takes onClose
 */
export const spawn = (
  cmd: string,
  params: string[],
  cwd: string,
  onClose?: (code: number, pid: number) => void,
): number => {
  log(`Running "${cmd} ${params.join(" ")}"`);
  log();

  const runner = Deno.run({
    cmd: [cmd].concat(params),
    cwd,
    env: Deno.env.toObject(),
    stdin: "inherit",
    stdout: "inherit",
  });

  runner.status().then((response) => {
    const code = response.code;
    log();
    if (code) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      log(`Command "${cmd}" failed with exit code: ${code}`);
    }

    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    onClose && onClose(code, runner.pid);
  });

  return runner.pid;
};
