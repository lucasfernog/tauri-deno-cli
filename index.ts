const { args } = Deno;

const cmds = ["build"];
const command = args[0];

if (
  !command || !cmds.includes(command) || command === "-h" ||
  command === "--help" || command === "help"
) {
  console.log(`
    Description
      This is the Tauri CLI.
    Usage
      $ tauri ${cmds.join("|")}
    Options
      --help, -h     Displays this message
      --version, -v  Displays the Tauri CLI version
  `);
} else {
  import(`./commands/${command}.ts`).then(({ default: fn }) => {
    fn();
  });
}
