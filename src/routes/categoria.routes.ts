import { Router } from "express";
import { CategoriaController } from "../controllers/categoria.controller";

const router = Router();
const controller = new CategoriaController();

router.get("/", controller.listar.bind(controller));
router.get("/:id", controller.buscarPorId.bind(controller));

export { router as categoriaRouter };
