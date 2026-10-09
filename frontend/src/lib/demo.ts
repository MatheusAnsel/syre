// Credenciais da conta de demonstração (perfil "demo", somente leitura) para recrutadores.
// São públicas de propósito: o backend recusa qualquer escrita desse perfil (403).
// Podem ser trocadas por VITE_DEMO_EMAIL / VITE_DEMO_SENHA; VITE_DEMO_DESATIVADO=true esconde o botão.
export const DEMO_EMAIL: string = import.meta.env.VITE_DEMO_EMAIL || 'recrutador@syre.dev';
export const DEMO_SENHA: string = import.meta.env.VITE_DEMO_SENHA || 'demo-syre-2026';
export const DEMO_ATIVO: boolean = import.meta.env.VITE_DEMO_DESATIVADO !== 'true';
