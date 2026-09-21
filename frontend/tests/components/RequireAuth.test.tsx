import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/lib/auth';
import RequireAuth from '../../src/components/layout/RequireAuth';
import { setToken } from '../../src/lib/api';

function renderProtegida() {
  render(
    <MemoryRouter initialEntries={['/area-restrita']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Tela de login</div>} />
          <Route
            path="/area-restrita"
            element={
              <RequireAuth>
                <div>Conteúdo protegido</div>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('redireciona para /login quando não há usuário autenticado', async () => {
    renderProtegida();
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  it('mostra o conteúdo protegido quando a sessão é válida', async () => {
    setToken('token-valido');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: '1', nome: 'Teste', email: 'gente@teste.com' }),
    }) as unknown as typeof fetch;

    renderProtegida();
    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
