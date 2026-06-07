import { z } from "zod";

export const registroSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().trim().email("E-mail inválido").toLowerCase(),
  senha: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(72, "Senha muito longa"), // bcrypt tem limite de 72 bytes
});

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").toLowerCase(),
  senha: z.string().min(1, "Informe a senha"),
});

// Tipos inferidos para usar nos controllers
export type RegistroInput = z.infer<typeof registroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
