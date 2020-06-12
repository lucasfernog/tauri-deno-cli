import { red, green } from "https://deno.land/std/fmt/colors.ts";
import { ms } from "https://raw.githubusercontent.com/denolib/ms/master/ms.ts";

let prevTime: number;

export default (banner: string, color: string = "green") => {
  return (msg?: string) => {
    const curr = +new Date();
    const diff = curr - (prevTime || curr);

    prevTime = curr;

    if (msg) {
      const colorFn = color === "green" ? green : red;
      console.log(
        // TODO: proper typings for color and banner
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
        ` ${colorFn(String(banner))} ${msg} ${green(`+${ms(diff)}`)}`,
      );
    } else {
      console.log();
    }
  };
};
