import fs from "fs";
import path from "path";
import dayjs from "dayjs";

function opportunitiesPath() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const date = dayjs().format("YYYY-MM-DD");
  return path.join(dir, `opportunities-${date}.jsonl`);
}

export function publishOpportunity(op: any) {
  const line = JSON.stringify(op);
  fs.appendFileSync(opportunitiesPath(), line + "\n");
}

