import { Router } from "express";
import { produtoRouter } from "./produto.routes";
import { categoriaRouter } from "./categoria.routes";

const router = Router();

// Prefixo + router específico
// GET /api/produtos → produtoRouter
// GET /api/categorias → categoriaRouter
router.use("/produtos",   produtoRouter);
router.use("/categorias", categoriaRouter);

export { router };
