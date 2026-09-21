/**
 * Popula o Syre com dados fictícios para teste manual (clientes, fornecedores,
 * produtos, vendas, movimentações de estoque e contas a receber).
 *
 * Uso:
 *   SYRE_API_URL=https://syre-7jt3.onrender.com \
 *   SYRE_EMAIL=voce@exemplo.com \
 *   SYRE_SENHA='sua-senha' \
 *   node seed-teste.mjs
 *
 * Requer Node 18+ (usa fetch nativo). Não apaga nada existente — só adiciona.
 */

const API = process.env.SYRE_API_URL || 'http://localhost:3001';
const EMAIL = process.env.SYRE_EMAIL;
const SENHA = process.env.SYRE_SENHA;

if (!EMAIL || !SENHA) {
  console.error('Defina SYRE_EMAIL e SYRE_SENHA (as credenciais do seu usuário admin) antes de rodar.');
  process.exit(1);
}

let token = '';

async function chamar(method, path, body) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${dados?.error || texto}`);
  }
  return dados;
}

// ---------- geradores de CPF/CNPJ válidos ----------
function calcDigito(base, pesos) {
  let soma = 0;
  for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}
function gerarCpf() {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  const d1 = calcDigito(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigito(base + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const n = base + d1 + d2;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}
function gerarCnpj() {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  const d1 = calcDigito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigito(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const n = base + d1 + d2;
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}/${n.slice(8, 12)}-${n.slice(12)}`;
}

// ---------- dados fictícios ----------
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Fábio', 'Gabriela', 'Hugo', 'Isabela', 'João',
  'Karina', 'Lucas', 'Marina', 'Nelson', 'Olívia', 'Paulo', 'Quésia', 'Rafael', 'Sabrina', 'Tiago'];
const SOBRENOMES = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Gomes'];
const CIDADES_UF = [
  ['Rio de Janeiro', 'RJ'], ['São Paulo', 'SP'], ['Belo Horizonte', 'MG'], ['Niterói', 'RJ'],
  ['Curitiba', 'PR'], ['Salvador', 'BA'], ['Porto Alegre', 'RS'], ['Recife', 'PE'],
  ['Fortaleza', 'CE'], ['Brasília', 'DF'],
];
const EMPRESAS = ['Distribuidora Atlântica', 'Comercial Boa Vista', 'Indústria Nova Era', 'Suprimentos Rio Sul',
  'Grupo Horizonte', 'Papelaria Central', 'Metalúrgica Vitória', 'Alimentos do Vale', 'Têxtil Bela Manhã', 'Química Bandeirantes'];
const PRODUTOS_NOMES = [
  ['Caneta esferográfica azul', 'Papelaria'], ['Caderno universitário 96fl', 'Papelaria'],
  ['Resma de papel A4', 'Papelaria'], ['Grampeador médio', 'Papelaria'],
  ['Parafuso sextavado M6', 'Ferragens'], ['Arruela de pressão', 'Ferragens'],
  ['Tinta acrílica branca 18L', 'Tintas'], ['Rolo de pintura 23cm', 'Tintas'],
  ['Café torrado 500g', 'Alimentos'], ['Açúcar refinado 1kg', 'Alimentos'],
  ['Detergente neutro 500ml', 'Limpeza'], ['Sabão em pó 1kg', 'Limpeza'],
];

const aleatorio = (arr) => arr[Math.floor(Math.random() * arr.length)];
const inteiro = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log(`Entrando como ${EMAIL} em ${API}...`);
  const login = await chamar('POST', '/auth/login', { email: EMAIL, senha: SENHA });
  token = login.token;
  console.log('Login OK.\n');

  console.log('Criando 10 fornecedores...');
  const fornecedores = [];
  for (let i = 0; i < 10; i++) {
    const [cidade, estado] = aleatorio(CIDADES_UF);
    const f = await chamar('POST', '/fornecedores', {
      nome: `${EMPRESAS[i]} Ltda`,
      cnpj: gerarCnpj(),
      email: `contato@${EMPRESAS[i].toLowerCase().replace(/\s+/g, '')}.com.br`,
      telefone: `(${inteiro(11, 99)}) ${inteiro(3000, 3999)}-${inteiro(1000, 9999)}`,
      cidade, estado,
      cep: `${inteiro(10000, 99999)}-${inteiro(100, 999)}`,
      endereco: `Rua ${aleatorio(SOBRENOMES)}, ${inteiro(10, 999)}`,
    });
    fornecedores.push(f);
  }
  console.log(`  ${fornecedores.length} fornecedores criados.\n`);

  console.log('Criando 12 produtos...');
  const produtos = [];
  for (let i = 0; i < PRODUTOS_NOMES.length; i++) {
    const [nome, categoria] = PRODUTOS_NOMES[i];
    const precoCusto = inteiro(500, 5000) / 100;
    const p = await chamar('POST', '/produtos', {
      codigo: `SKU-${String(i + 1).padStart(4, '0')}`,
      nome,
      categoria,
      unidade: 'UN',
      preco_custo: precoCusto,
      preco_venda: Math.round(precoCusto * 1.6 * 100) / 100,
      estoque_atual: inteiro(80, 300),
      estoque_minimo: inteiro(10, 30),
      fornecedor_id: aleatorio(fornecedores).id,
    });
    produtos.push(p);
  }
  console.log(`  ${produtos.length} produtos criados.\n`);

  console.log('Criando 10 clientes...');
  const clientes = [];
  for (let i = 0; i < 10; i++) {
    const [cidade, estado] = aleatorio(CIDADES_UF);
    const nome = `${aleatorio(NOMES)} ${aleatorio(SOBRENOMES)}`;
    const c = await chamar('POST', '/clientes', {
      nome,
      cpf_cnpj: gerarCpf(),
      email: `${nome.toLowerCase().replace(/\s+/g, '.')}${inteiro(1, 99)}@email.com`,
      telefone: `(${inteiro(11, 99)}) 9${inteiro(1000, 9999)}-${inteiro(1000, 9999)}`,
      cidade, estado,
      cep: `${inteiro(10000, 99999)}-${inteiro(100, 999)}`,
      endereco: `Av. ${aleatorio(SOBRENOMES)}, ${inteiro(10, 999)}`,
    });
    clientes.push(c);
  }
  console.log(`  ${clientes.length} clientes criados.\n`);

  console.log('Registrando 10 vendas (gera contas a receber automaticamente)...');
  let vendasCriadas = 0;
  for (let i = 0; i < 10; i++) {
    const nItens = inteiro(1, 3);
    const usados = new Set();
    const itens = [];
    while (itens.length < nItens) {
      const p = aleatorio(produtos);
      if (usados.has(p.id)) continue;
      usados.add(p.id);
      itens.push({ produto_id: p.id, quantidade: inteiro(1, 5) });
    }
    await chamar('POST', '/vendas', {
      cliente_id: aleatorio(clientes).id,
      itens,
      desconto: Math.random() < 0.3 ? inteiro(1, 20) : 0,
      observacoes: 'Venda de teste (dados fictícios)',
    });
    vendasCriadas++;
  }
  console.log(`  ${vendasCriadas} vendas criadas (e ${vendasCriadas} contas a receber geradas junto).\n`);

  console.log('Registrando 10 movimentações manuais de estoque...');
  let movs = 0;
  for (let i = 0; i < 10; i++) {
    const p = aleatorio(produtos);
    const tipo = Math.random() < 0.7 ? 'entrada' : 'saida';
    await chamar('POST', `/produtos/${p.id}/estoque`, {
      tipo,
      quantidade: inteiro(1, 10),
      motivo: tipo === 'entrada' ? 'Reposição de fornecedor (teste)' : 'Ajuste de inventário (teste)',
    });
    movs++;
  }
  console.log(`  ${movs} movimentações registradas.\n`);

  console.log('Recebendo parcialmente 3 contas a receber, para variar os status...');
  const contas = await chamar('GET', '/contas-receber?status=aberta');
  for (const conta of contas.slice(0, 3)) {
    await chamar('PATCH', `/contas-receber/${conta.id}/receber`, {
      valor_pago: Math.round(Number(conta.valor) * 0.4 * 100) / 100,
    });
  }
  console.log('  Ok.\n');

  console.log('Tudo criado com sucesso:');
  console.log(`  Fornecedores: ${fornecedores.length}`);
  console.log(`  Produtos: ${produtos.length}`);
  console.log(`  Clientes: ${clientes.length}`);
  console.log(`  Vendas: ${vendasCriadas}`);
  console.log(`  Contas a receber: ${vendasCriadas} (geradas pelas vendas)`);
  console.log(`  Movimentações de estoque: ${movs}`);
}

main().catch((err) => {
  console.error('\nFalhou:', err.message);
  process.exit(1);
});
