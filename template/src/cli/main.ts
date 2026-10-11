import { runCli } from "./cli";

// No top-level await: tsx compiles this file as CommonJS.
runCli(process.argv.slice(2), {
  env: process.env,
  out: (s) => console.log(s),
  err: (s) => console.error(s),
}).then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error((e as Error).message);
    process.exit(1);
  },
);
