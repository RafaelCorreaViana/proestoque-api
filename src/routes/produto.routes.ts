import { Router } from "express";
import { ProdutoController } from "../controllers/produto.controller";
import { autenticar } from "../middlewares/auth";

const router = Router();
const controller = new ProdutoController();

// Aplicar o middleware autenticar em TODAS as rotas deste router
router.use(autenticar);

router.get("/",        controller.listar.bind(controller));
router.get("/:id",     controller.buscarPorId.bind(controller));
router.post("/",       controller.criar.bind(controller));
router.put("/:id",     controller.atualizar.bind(controller));
router.delete("/:id",  controller.deletar.bind(controller));

// endpoints do Desafio Bônus
router.post("/:id/movimentacao", controller.registrarMovimentacao.bind(controller));
router.get("/:id/movimentacoes", controller.listarMovimentacoes.bind(controller));

export { router as produtoRouter };
