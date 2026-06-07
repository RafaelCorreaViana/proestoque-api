import express from "express";
import cors from "cors";
import { router } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

// —— Middlewares Globais ——————————————————————————————

// Permite que o app React Native acesse a API
// Em produção, restrinja as origens: cors({ origin: "https://seuapp.com" })
app.use(cors());

// Habilita leitura de req.body como JSON (obrigatório para POST/PUT)
app.use(express.json());

// Log de requisições em desenvolvimento
if (process.env.NODE_ENV === "development") {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });
}

// —— Rota de healthcheck ——————————————————————————————
// Útil para verificar se o servidor está online
app.get("/", (_req, res) => {
  res.json({ status: "ok", app: "ProEstoque API", versao: "1.0.0" });
});

// —— Rotas da API —————————————————————————————————————
// Todas as rotas ficam sob o prefixo /api
// Ex: GET /api/produtos, POST /api/categorias
app.use("/api", router);

// —— Middleware de Erros (sempre por último!) —————————
// O Express identifica middleware de erro pelos 4 parâmetros (err, req, res, next)
app.use(errorHandler);

export { app };
