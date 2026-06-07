import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "./errorHandler";
import type { JwtPayload } from "../controllers/auth.controller";

// Extende o tipo Request do Express para incluir o usuário autenticado
// Isso permite acessar req.usuario em qualquer controller protegido
declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Extrair o token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Token não fornecido", 401);
    }

    // Header: "Bearer eyJhbGci..."
    // Split por espaço → ["Bearer", "eyJhbGci..."]
    const [tipo, token] = authHeader.split(" ");

    if (tipo !== "Bearer" || !token) {
      throw new AppError("Formato de token inválido. Use: Bearer <token>", 401);
    }

    // 2. Verificar e decodificar o token
    // jwt.verify() lança exceção se:
    // - Assinatura inválida (token adulterado)
    // - Token expirado (exp no passado)
    // - Token malformado
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // 3. Anexar o payload ao request para os controllers acessarem
    req.usuario = payload;
    // Agora qualquer controller pode fazer: req.usuario.sub (ID do usuário)

    // 4. Passar para o próximo middleware ou controller
    next();
  } catch (error) {
    // jwt.verify() lança JsonWebTokenError ou TokenExpiredError
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        // Token expirado — cliente precisa fazer login novamente
        next(new AppError("Token expirado. Faça login novamente.", 401));
        return;
      }
      if (error.name === "JsonWebTokenError") {
        next(new AppError("Token inválido.", 401));
        return;
      }
    }
    next(error);
  }
}
