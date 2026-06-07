import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";

export class CategoriaController {

  async listar(_req: Request, res: Response, next: NextFunction) {
    try {
      const categorias = await prisma.categoria.findMany({
        orderBy: { nome: "asc" },
        // Inclui a contagem de produtos de cada categoria
        include: {
          _count: { select: { produtos: true } }
        },
      });
      res.json(categorias);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const categoria = await prisma.categoria.findUnique({
        where: { id },
        include: { produtos: { orderBy: { nome: "asc" } } },
      });
      if (!categoria) throw new AppError("Categoria não encontrada", 404);
      res.json(categoria);
    } catch (error) {
      next(error);
    }
  }
}
