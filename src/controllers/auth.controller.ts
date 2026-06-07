import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client";
import { AppError } from "../middlewares/errorHandler";
import { config } from "../config";

// Tipo que o JWT vai carregar no payload
// Exportado para reutilizar no middleware de autenticação
export type JwtPayload = {
  sub: string;  // subject = ID do usuário (padrão JWT)
  nome: string;
  email: string;
};

// Função auxiliar: gera o JWT com os dados do usuário (Access Token - expira em 7 dias)
function gerarToken(usuario: { id: string; nome: string; email: string }): string {
  const payload: JwtPayload = {
    sub: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };

  // sign(payload, secret, options)
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn, // "7d"
  });
}

// Função auxiliar: gera o Refresh Token (expires em 30 dias)
function gerarRefreshToken(usuario: { id: string; nome: string; email: string }): string {
  const payload = {
    sub: usuario.id,
    email: usuario.email,
    type: "refresh",
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: "30d",
  });
}

export class AuthController {

  // —— POST /api/auth/registro ————————————————————————————————
  async registrar(req: Request, res: Response, next: NextFunction) {
    try {
      const { nome, email, senha } = req.body;
      // req.body já foi validado pelo middleware validate(registroSchema)

      // 1. Verificar se o e-mail já está em uso
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email },
      });

      if (usuarioExistente) {
        // 409 Conflict = recurso já existe
        throw new AppError("E-mail já cadastrado", 409);
      }

      // 2. Gerar o hash da senha
      const senhaHash = await bcrypt.hash(senha, 10);

      // 3. Criar o usuário temporariamente no banco
      const usuarioTemp = await prisma.usuario.create({
        data: { nome, email, senha: senhaHash },
      });

      // 4. Gerar o JWT e o Refresh Token
      const token = gerarToken(usuarioTemp);
      const refreshToken = gerarRefreshToken(usuarioTemp);

      // 5. Salvar o refresh token no banco
      const usuario = await prisma.usuario.update({
        where: { id: usuarioTemp.id },
        data: { refreshToken },
        select: { id: true, nome: true, email: true, criadoEm: true },
      });

      // 201 Created
      res.status(201).json({
        usuario,
        token,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  // —— POST /api/auth/login ———————————————————————————————————
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, senha } = req.body;

      // 1. Buscar o usuário pelo e-mail
      const usuario = await prisma.usuario.findUnique({
        where: { email },
      });

      // E-mail ou senha inválidos genérico para privacidade
      if (!usuario) {
        throw new AppError("E-mail ou senha inválidos", 401);
      }

      // 2. Comparar a senha enviada com o hash do banco
      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        throw new AppError("E-mail ou senha inválidos", 401);
      }

      // 3. Gerar os novos tokens
      const token = gerarToken(usuario);
      const refreshToken = gerarRefreshToken(usuario);

      // 4. Atualizar o refresh token do usuário no banco
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { refreshToken },
      });

      // 5. Retornar usuário sem a senha e sem o token sensível
      const { senha: _, refreshToken: __, ...usuarioSemSenha } = usuario;

      res.json({
        usuario: usuarioSemSenha,
        token,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  // —— GET /api/auth/me ———————————————————————————————————————
  async perfil(req: Request, res: Response, next: NextFunction) {
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: (req as any).usuario.sub },
        select: { id: true, nome: true, email: true, criadoEm: true },
      });

      if (!usuario) throw new AppError("Usuário não encontrado", 404);

      res.json(usuario);
    } catch (error) {
      next(error);
    }
  }

  // —— [BONUS] POST /api/auth/refresh —————————————————────────
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError("Refresh token não fornecido", 400);
      }

      // Verificar a assinatura e validade do token
      let payload: any;
      try {
        payload = jwt.verify(refreshToken, config.jwtSecret);
      } catch (err) {
        throw new AppError("Refresh token inválido ou expirado", 401);
      }

      // Buscar o usuário no banco
      const usuario = await prisma.usuario.findUnique({
        where: { id: payload.sub },
      });

      // Verificar se o usuário existe e se o token corresponde ao que está salvo
      if (!usuario || usuario.refreshToken !== refreshToken) {
        throw new AppError("Refresh token inválido ou revogado", 401);
      }

      // Gerar novo access token e novo refresh token
      const novoAccessToken = gerarToken(usuario);
      const novoRefreshToken = gerarRefreshToken(usuario);

      // Atualizar o banco com o novo refresh token
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { refreshToken: novoRefreshToken },
      });

      res.json({
        token: novoAccessToken,
        refreshToken: novoRefreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
}
