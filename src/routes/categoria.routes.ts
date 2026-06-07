import { Router } from "express";
import { CategoriaController } from "../controllers/categoria.controller";
import { autenticar } from "../middlewares/auth";

const router = Router();
const controller = new CategoriaController();

// Aplicar o middleware autenticar em TODAS as rotas deste router
router.use(autenticar);

router.get("/", controller.listar.bind(controller));
router.get("/:id", controller.buscarPorId.bind(controller));

export { router as categoriaRouter };
