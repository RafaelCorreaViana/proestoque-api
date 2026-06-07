import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";

export class ProdutoController {

  // —— GET /api/produtos ——————————————————————————————————————
  // Suporta filtros opcionais via query string:
  // /api/produtos?busca=cafe&categoriaId=cat_1&apenasAlerta=true
  async listar(req: Request, res: Response, next: NextFunction) {
    try {
      const { busca, categoriaId, apenasAlerta } = req.query;

      const produtos = await prisma.produto.findMany({
        where: {
          // Filtro de texto: busca no nome (case-insensitive no SQLite com mode)
          ...(busca && {
            nome: { contains: String(busca), mode: "insensitive" }
          }),
          // Filtro por categoria (só aplica se categoriaId foi passado)
          ...(categoriaId && { categoriaId: String(categoriaId) }),
          // Filtro de alerta: quantidade < quantidadeMinima
          ...(apenasAlerta === "true" && {
            quantidade: { lt: prisma.produto.fields.quantidadeMinima }
          }),
        },
        // include traz os dados relacionados junto (JOIN automático)
        include: { categoria: true },
        orderBy: { nome: "asc" }, // Ordena por nome crescente
      });

      res.json(produtos);
    } catch (error) {
      // next(error) passa o erro para o errorHandler global
      next(error);
    }
  }

  // —— GET /api/produtos/:id ————————————————————————————————
  async buscarPorId(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const produto = await prisma.produto.findUnique({
        where: { id },
        include: { categoria: true },
      });

      // Se não encontrou, lança erro 404 — capturado pelo errorHandler
      if (!produto) {
        throw new AppError("Produto não encontrado", 404);
      }

      res.json(produto);
    } catch (error) {
      next(error);
    }
  }

  // —— POST /api/produtos ———————————————————————————————————
  async criar(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        nome,
        categoriaId,
        quantidade,
        quantidadeMinima,
        preco,
        unidade,
        observacao,
        foto,
      } = req.body;

      // —— Validação básica dos campos obrigatórios ——
      if (!nome || !categoriaId || preco === undefined) {
        throw new AppError("Campos obrigatórios: nome, categoriaId, preco");
      }

      // Verifica se a categoria existe antes de criar o produto
      const categoriaExiste = await prisma.categoria.findUnique({
        where: { id: categoriaId },
      });
      if (!categoriaExiste) {
        throw new AppError("Categoria não encontrada", 404);
      }

      const produto = await prisma.produto.create({
        data: {
          nome: String(nome).trim(),
          categoriaId,
          quantidade:       Number(quantidade ?? 0),
          quantidadeMinima: Number(quantidadeMinima ?? 0),
          preco:            Number(preco),
          unidade:          String(unidade ?? "un"),
          observacao:       observacao ? String(observacao) : null,
          foto:             foto ? String(foto) : null,
        },
        // Retorna o produto criado JÁ com os dados da categoria
        include: { categoria: true },
      });

      // 201 Created — padrão REST para criação bem-sucedida
      res.status(201).json(produto);
    } catch (error) {
      next(error);
    }
  }

  // —— PUT /api/produtos/:id ————————————————————————————————
  async atualizar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        nome,
        categoriaId,
        quantidade,
        quantidadeMinima,
        preco,
        unidade,
        observacao,
        foto,
      } = req.body;

      // Verifica se o produto existe antes de atualizar
      const produtoExiste = await prisma.produto.findUnique({ where: { id } });
      if (!produtoExiste) {
        throw new AppError("Produto não encontrado", 404);
      }

      // Se categoriaId foi enviado, verifica se existe
      if (categoriaId) {
        const catExiste = await prisma.categoria.findUnique({ where: { id: categoriaId } });
        if (!catExiste) throw new AppError("Categoria não encontrada", 404);
      }

      const produto = await prisma.produto.update({
        where: { id },
        data: {
          // Spread + undefined: só atualiza campos que foram enviados
          // Se nome não veio no body, mantém o valor atual do banco
          ...(nome !== undefined      && { nome: String(nome).trim() }),
          ...(categoriaId !== undefined && { categoriaId }),
          ...(quantidade !== undefined  && { quantidade: Number(quantidade) }),
          ...(quantidadeMinima !== undefined && { quantidadeMinima: Number(quantidadeMinima) }),
          ...(preco !== undefined      && { preco: Number(preco) }),
          ...(unidade !== undefined    && { unidade: String(unidade) }),
          ...(observacao !== undefined && { observacao: observacao || null }),
          ...(foto !== undefined       && { foto: foto || null }),
          // Atualiza ultimaMovimentacao
          ultimaMovimentacao: new Date(),
        },
        include: { categoria: true },
      });

      res.json(produto);
    } catch (error) {
      next(error);
    }
  }

  // —— DELETE /api/produtos/:id —————————————————————————————
  async deletar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verifica se existe antes de deletar
      const produtoExiste = await prisma.produto.findUnique({ where: { id } });
      if (!produtoExiste) {
        throw new AppError("Produto não encontrado", 404);
      }

      await prisma.produto.delete({ where: { id } });

      // 204 No Content — padrão REST para exclusão bem-sucedida (sem body)
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // —— [BONUS] POST /api/produtos/:id/movimentacao ——————————
  async registrarMovimentacao(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { tipo, quantidade, observacao } = req.body;

      if (!tipo || quantidade === undefined) {
        throw new AppError("Campos obrigatórios: tipo, quantidade");
      }

      const tipoUpper = String(tipo).toUpperCase();
      if (tipoUpper !== "ENTRADA" && tipoUpper !== "SAIDA") {
        throw new AppError("O tipo de movimentação deve ser 'ENTRADA' ou 'SAIDA'");
      }

      const qtdNum = Number(quantidade);
      if (isNaN(qtdNum) || qtdNum <= 0 || !Number.isInteger(qtdNum)) {
        throw new AppError("A quantidade deve ser um número inteiro maior que 0");
      }

      // Verifica se o produto existe
      const produto = await prisma.produto.findUnique({ where: { id } });
      if (!produto) {
        throw new AppError("Produto não encontrado", 404);
      }

      // Se for saída, verifica se tem estoque suficiente
      if (tipoUpper === "SAIDA" && produto.quantidade < qtdNum) {
        throw new AppError(`Estoque insuficiente. Quantidade disponível: ${produto.quantidade}`, 400);
      }

      // Executa transação atômica do Prisma
      const [movimentacao, produtoAtualizado] = await prisma.$transaction([
        prisma.movimentacao.create({
          data: {
            produtoId: id,
            tipo: tipoUpper,
            quantidade: qtdNum,
            observacao: observacao ? String(observacao) : null
          }
        }),
        prisma.produto.update({
          where: { id },
          data: {
            quantidade: {
              increment: tipoUpper === "ENTRADA" ? qtdNum : -qtdNum
            },
            ultimaMovimentacao: new Date()
          },
          include: { categoria: true }
        })
      ]);

      res.status(201).json({
        mensagem: "Movimentação registrada com sucesso",
        movimentacao,
        produto: produtoAtualizado
      });
    } catch (error) {
      next(error);
    }
  }

  // —— [BONUS] GET /api/produtos/:id/movimentacoes ——————————
  async listarMovimentacoes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verifica se o produto existe
      const produtoExiste = await prisma.produto.findUnique({ where: { id } });
      if (!produtoExiste) {
        throw new AppError("Produto não encontrado", 404);
      }

      const movimentacoes = await prisma.movimentacao.findMany({
        where: { produtoId: id },
        orderBy: { criadoEm: "desc" }
      });

      res.json(movimentacoes);
    } catch (error) {
      next(error);
    }
  }
}
