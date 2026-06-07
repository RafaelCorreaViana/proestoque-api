import { Request, Response, NextFunction } from "express";

// Classe de erro customizada para erros HTTP esperados
// Ex: produto não encontrado (404), dados inválidos (400)
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Middleware de erro global — captura TODOS os erros não tratados
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction // Obrigatório mesmo sem usar — Express precisa do 4º parâmetro
): void {
  // Erros esperados da aplicação
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ erro: err.message });
    return;
  }

  // Erros do Prisma (ex: violação de unique constraint)
  if (err.name === "PrismaClientKnownRequestError") {
    res.status(409).json({ erro: "Conflito de dados no banco" });
    return;
  }

  // Erros inesperados — não expor detalhes em produção
  console.error("Erro inesperado:", err);
  res.status(500).json({
    erro: process.env.NODE_ENV === "development" ? err.message : "Erro interno do servidor"
  });
}
