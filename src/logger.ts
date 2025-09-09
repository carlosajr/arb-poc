import pino from "pino";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";

const logsDir = path.join(process.cwd(), "logs");
fs.mkdirSync(logsDir, { recursive: true });

const filePath = path.join(logsDir, "app.log");
const timeFmt = "DDMMYYYY HH:mm:ss:SSS";

const timestamp = () => `,"time":"${dayjs().format(timeFmt)}"`;

export const consoleLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname"
    }
  }
});

export const fileLogger = pino(
  { level: process.env.LOG_LEVEL || "info", timestamp },
  pino.destination({ dest: filePath, sync: false })
);

export function log(level: "info"|"warn"|"error"|"debug", msg: string, obj?: any) {
  (consoleLogger as any)[level](obj ?? {}, msg);
  (fileLogger as any)[level](obj ?? {}, msg);
}
