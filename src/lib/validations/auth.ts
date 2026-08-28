import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail valido"),
  password: z.string().min(1, "Informe sua senha"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const signUpSchema = z
  .object({
    companyName: z.string().trim().min(2, "Informe o nome da empresa"),
    email: z.string().trim().email("Informe um e-mail valido"),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof signUpSchema>;

export const onboardingSchema = z.object({
  companyName: z.string().trim().min(2, "Informe o nome da empresa"),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;
