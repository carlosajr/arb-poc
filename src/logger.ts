import pino from "pino";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";

const logsDir = path.join(process.cwd(), "logs");
fs.mkdirSync(logsDir, { recursive: true });

const date = dayjs().format("YYYY-MM-DD");
const filePath = path.join(logsDir, `app-${date}.log`);

export const consoleLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname"
    }
  }
});

export const fileLogger = pino(
  { level: process.env.LOG_LEVEL || "info" },
  pino.destination({ dest: filePath, sync: false })
);

export function log(level: "info"|"warn"|"error"|"debug", msg: string, obj?: any) {
  (consoleLogger as any)[level](obj ?? {}, msg);
  (fileLogger as any)[level](obj ?? {}, msg);
}
