import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { registroSchema, loginSchema } from "../schemas/auth.schema";
import { autenticar } from "../middlewares/auth";

const router = Router();
const controller = new AuthController();

// Rotas PÚBLICAS — sem middleware de autenticação
router.post(
  "/registro",
  validate(registroSchema),   // valida o body com zod
  controller.registrar.bind(controller)
);

router.post(
  "/login",
  validate(loginSchema),
  controller.login.bind(controller)
);

// Rota de refresh token (Bônus)
router.post(
  "/refresh",
  controller.refresh.bind(controller)
);

// Rota PROTEGIDA — requer token de acesso válido
router.get("/me", autenticar, controller.perfil.bind(controller));

export { router as authRouter };
