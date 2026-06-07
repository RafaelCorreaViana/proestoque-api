import { Router } from "express";
import { ProdutoController } from "../controllers/produto.controller";

const router = Router();
const controller = new ProdutoController();

// Cada linha mapeia: VERBO + URL → função do controller
// O .bind(controller) garante que o 'this' dentro do método aponte para o controller
router.get("/",        controller.listar.bind(controller));
router.get("/:id",     controller.buscarPorId.bind(controller));
router.post("/",       controller.criar.bind(controller));
router.put("/:id",     controller.atualizar.bind(controller));
router.delete("/:id",  controller.deletar.bind(controller));

// endpoints do Desafio Bônus
router.post("/:id/movimentacao", controller.registrarMovimentacao.bind(controller));
router.get("/:id/movimentacoes", controller.listarMovimentacoes.bind(controller));

export { router as produtoRouter };
