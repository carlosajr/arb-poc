"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileLogger = exports.consoleLogger = void 0;
exports.log = log;
const pino_1 = __importDefault(require("pino"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const logsDir = path_1.default.join(process.cwd(), "logs");
fs_1.default.mkdirSync(logsDir, { recursive: true });
const date = (0, dayjs_1.default)().format("YYYY-MM-DD");
const filePath = path_1.default.join(logsDir, `app-${date}.log`);
exports.consoleLogger = (0, pino_1.default)({
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
exports.fileLogger = (0, pino_1.default)({ level: process.env.LOG_LEVEL || "info" }, pino_1.default.destination({ dest: filePath, sync: false }));
function log(level, msg, obj) {
    exports.consoleLogger[level](obj ?? {}, msg);
    exports.fileLogger[level](obj ?? {}, msg);
}
