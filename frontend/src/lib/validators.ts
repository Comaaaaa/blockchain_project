import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caracteres'),
});

export const signUpSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caracteres'),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export const tokenPurchaseSchema = z.object({
  tokens: z
    .number()
    .min(1, 'Minimum 1 token')
    .max(1000, 'Maximum 1000 tokens par transaction'),
});

export const createListingSchema = z.object({
  tokens: z.number().min(1, 'Minimum 1 token'),
  pricePerToken: z.number().min(1, 'Le prix doit etre positif'),
});

export const propertySchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caracteres'),
  description: z.string().min(20, 'La description doit contenir au moins 20 caracteres'),
  address: z.string().min(5, 'Adresse requise'),
  city: z.string().min(2, 'Ville requise'),
  zipCode: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)'),
  type: z.enum(['apartment', 'house', 'commercial', 'land']),
  price: z.number().min(10000, 'Prix minimum 10 000 EUR'),
  surface: z.number().min(5, 'Surface minimum 5 m2'),
  rooms: z.number().min(1, 'Minimum 1 piece'),
  bedrooms: z.number().min(0),
  yearBuilt: z.number().min(1700).max(new Date().getFullYear()),
  totalTokens: z.number().min(100, 'Minimum 100 tokens'),
  tokenPrice: z.number().min(10, 'Prix minimum 10 EUR par token'),
  annualRent: z.number().min(0),
  annualCharges: z.number().min(0),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type TokenPurchaseFormData = z.infer<typeof tokenPurchaseSchema>;
export type CreateListingFormData = z.infer<typeof createListingSchema>;
export type PropertyFormData = z.infer<typeof propertySchema>;
