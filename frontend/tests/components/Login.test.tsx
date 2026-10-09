import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/lib/auth';
import Login from '../../src/pages/Login';

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Página inicial</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('mostra a mensagem de erro da API quando o login falha', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Credenciais inválidas' }),
    }) as unknown as typeof fetch;

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('voce@exemplo.com'), 'gente@teste.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('Credenciais inválidas')).toBeInTheDocument();
  });

  it('navega para a página inicial após login bem-sucedido', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: 'token-valido',
        usuario: { id: '1', nome: 'Teste', email: 'gente@teste.com' },
      }),
    }) as unknown as typeof fetch;

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('voce@exemplo.com'), 'gente@teste.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha-certa');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(screen.getByText('Página inicial')).toBeInTheDocument());
  });

  it('desabilita o botão e mostra "Entrando..." durante a requisição', async () => {
    let resolver: (v: unknown) => void = () => {};
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolver = resolve; })
    ) as unknown as typeof fetch;

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('voce@exemplo.com'), 'gente@teste.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'senha');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('button', { name: /entrando/i })).toBeDisabled();

    resolver({ ok: true, status: 200, json: async () => ({ token: 't', usuario: { id: '1', nome: 'T', email: 'e' } }) });
  });

  it('o botão de acesso demo preenche e-mail e senha com um clique, sem enviar o formulário', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;

    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /preencher com acesso demo/i }));

    expect(screen.getByPlaceholderText('voce@exemplo.com')).toHaveValue('recrutador@syre.dev');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('demo-syre-2026');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('depois de preencher com o demo, o login entra normalmente', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: 't',
        refreshToken: 'r',
        usuario: { id: '1', nome: 'Recrutador (demo)', email: 'recrutador@syre.dev', perfil: 'demo' },
      }),
    }) as unknown as typeof fetch;

    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /preencher com acesso demo/i }));
    await user.click(screen.getByRole('button', { name: /^entrar$/i }));

    await waitFor(() => expect(screen.getByText('Página inicial')).toBeInTheDocument());
    const [, init] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ email: 'recrutador@syre.dev', senha: 'demo-syre-2026' });
  });
});
