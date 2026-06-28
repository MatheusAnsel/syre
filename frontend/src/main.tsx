import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Fornecedores from './pages/Fornecedores';
import Produtos from './pages/Produtos';
import Estoque from './pages/Estoque';
import Vendas from './pages/Vendas';
import ContasReceber from './pages/ContasReceber';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/contas-receber" element={<ContasReceber />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
