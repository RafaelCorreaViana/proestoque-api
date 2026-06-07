import { Router } from "express";
import { produtoRouter } from "./produto.routes";
import { categoriaRouter } from "./categoria.routes";
import { authRouter } from "./auth.routes";

const router = Router();

// Rotas PÚBLICAS (sem JWT)
router.use("/auth",       authRouter);        // /api/auth/registro, /api/auth/login, /api/auth/refresh

// Rotas PRIVADAS (com JWT aplicado dentro de cada router)
router.use("/produtos",   produtoRouter);     // /api/produtos/*
router.use("/categorias", categoriaRouter);   // /api/categorias/*

export { router };
