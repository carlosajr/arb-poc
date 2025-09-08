import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { log } from "./logger";

const app = express();
const LOG_DIR = path.join(process.cwd(), "logs");

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const baseStyle = `
  body { font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4; }
  h1 { color: #333; }
  ul { list-style: none; padding: 0; }
  li { margin: 4px 0; }
  a { color: #007bff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .log-line { font-family: monospace; white-space: pre; padding: 2px 0; border-bottom: 1px solid #eee; }
  .line-number { color: #999; margin-right: 8px; }
`;

app.get("/", async (_req: any, res: any) => {
  try {
    const files = await fs.readdir(LOG_DIR);
    const links = files
      .map(f => `<li><a href="/logs/${encodeURIComponent(f)}">${f}</a></li>`)
      .join("");
    res.send(`<!DOCTYPE html><html><head><title>Logs</title><style>${baseStyle}</style></head><body><h1>Logs disponíveis</h1><ul>${links}</ul></body></html>`);
  } catch (err) {
    res.status(500).send("Erro ao listar logs");
  }
});

app.get("/logs/:file", async (req: any, res: any) => {
  const file = req.params.file;
  const full = path.join(LOG_DIR, file);
  if (!full.startsWith(LOG_DIR)) {
    res.status(400).send("Arquivo inválido");
    return;
  }
  try {
    const content = await fs.readFile(full, "utf-8");
    const lines = content.split(/\r?\n/);
    const htmlLines = lines
      .map((l, i) => `<li class="log-line"><span class="line-number">${i + 1}</span>${escapeHtml(l)}</li>`)
      .join("");
    res.send(`<!DOCTYPE html><html><head><title>${file}</title><style>${baseStyle}</style></head><body><h1>${file}</h1><a href="/">&larr; Voltar</a><ul class="log-lines">${htmlLines}</ul></body></html>`);
  } catch (err) {
    res.status(404).send("Log não encontrado");
  }
});

export function startLogServer() {
  const port = Number(process.env.LOG_SERVER_PORT) || 3000;
  app.listen(port, () => {
    log("info", "Servidor de logs iniciado", { port });
  });
}
