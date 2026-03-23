/**
 * URL base dell'API backend. In produzione, impostare NEXT_PUBLIC_API_URL
 * nella configurazione d'ambiente (es. Vercel, .env.production).
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
