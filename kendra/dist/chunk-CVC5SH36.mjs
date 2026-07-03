// src/utils/logger.ts
import chalk from "chalk";
var logger = {
  info: (msg) => console.log(chalk.cyan("\u2139"), msg),
  success: (msg) => console.log(chalk.green("\u2713"), chalk.green(msg)),
  warn: (msg) => console.log(chalk.yellow("\u26A0"), chalk.yellow(msg)),
  error: (msg) => console.log(chalk.red("\u2717"), chalk.red(msg)),
  step: (msg) => console.log(chalk.yellow("\u2192"), msg),
  header: (msg) => {
    console.log();
    console.log(chalk.bold.yellow("KENDRA") + chalk.dim(" // " + msg));
    console.log();
  },
  dim: (msg) => console.log(chalk.dim(msg)),
  code: (msg) => console.log(chalk.bgBlack.white(" " + msg + " ")),
  blank: () => console.log()
};

export {
  logger
};
//# sourceMappingURL=chunk-CVC5SH36.mjs.map