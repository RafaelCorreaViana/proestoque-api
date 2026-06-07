import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

// Factory de middleware: recebe um schema e retorna uma função middleware
// Uso: router.post("/registro", validate(registroSchema), controller.registrar)
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // parse() valida E transforma os dados (trim, toLowerCase, etc.)
      // Substitui req.body pelos dados limpos e tipados
      req.body = schema.parse(req.body);
      next(); // Passou na validação → vai para o controller
    } catch (error) {
      if (error instanceof ZodError) {
        // Formata os erros Zod para um objeto legível
        const erros = error.issues.map((e) => ({
          campo: e.path.join("."),
          mensagem: e.message,
        }));
        // 422 Unprocessable Entity = dados enviados mas inválidos
        res.status(422).json({ erro: "Dados inválidos", detalhes: erros });
        return;
      }
      next(error);
    }
  };
}
