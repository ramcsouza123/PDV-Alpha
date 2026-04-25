let produtoSelecionadoId = null;
let modoModal = 'cadastro';

// Adicionando evento de busca em tempo real
const campoFiltro = document.getElementById('filtro-estoque');
campoFiltro.addEventListener('input', (e) => {
    carregarTabela(e.target.value);
});

async function carregarTabela(busca = '') {
    // Usamos a mesma API de produtos que o PDV já usa para filtrar
    const url = busca ? `/api/produtos?q=${busca}` : '/api/produtos';
    const res = await fetch(url);
    const produtos = await res.json();
    const tbody = document.getElementById('tabela-produtos');
    tbody.innerHTML = '';

    produtos.forEach(p => {
        const rent = p.preco_custo > 0 ? (((p.preco_venda - p.preco_custo) / p.preco_custo) * 100).toFixed(1) : 0;
        const tr = document.createElement('tr');
        tr.className = 'border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition';
        tr.id = `linha-prod-${p.id}`;
        
        // Se este item já estava selecionado antes de recarregar, mantém o destaque
        if (p.id === produtoSelecionadoId) {
            tr.classList.add('bg-blue-900/40', 'border-l-4', 'border-l-blue-500');
        }

        tr.innerHTML = `
            <td class="p-4 font-mono text-blue-400">#${p.id}</td>
            <td class="p-4 font-bold text-white">${p.nome}</td>
            <td class="p-4 text-gray-400">${p.categoria || 'Sem categoria'}</td>
            <td class="p-4 text-right">R$ ${p.preco_custo.toFixed(2)}</td>
            <td class="p-4 text-right font-bold text-white">R$ ${p.preco_venda.toFixed(2)}</td>
            <td class="p-4 text-center ${p.estoque <= 5 ? 'text-red-500 font-black underline' : ''}">${p.estoque}</td>
            <td class="p-4 text-center text-green-400">${rent}%</td>
        `;
        tr.onclick = () => selecionarLinha(p.id);
        tbody.appendChild(tr);
    });
}

function selecionarLinha(id) {
    // Se clicar no mesmo item já selecionado, ele desmarca
    if (produtoSelecionadoId === id) {
        desmarcarSelecao();
        return;
    }

    desmarcarSelecao();
    produtoSelecionadoId = id;
    const linha = document.getElementById(`linha-prod-${id}`);
    if (linha) {
        linha.classList.add('bg-blue-900/40', 'border-l-4', 'border-l-blue-500');
    }
    
    // Habilitar botões
    const btnEditar = document.getElementById('btn-editar');
    const btnExcluir = document.getElementById('btn-excluir');
    
    [btnEditar, btnExcluir].forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
}

function desmarcarSelecao() {
    produtoSelecionadoId = null;
    document.querySelectorAll('#tabela-produtos tr').forEach(tr => {
        tr.classList.remove('bg-blue-900/40', 'border-l-4', 'border-l-blue-500');
    });
    
    const btnEditar = document.getElementById('btn-editar');
    const btnExcluir = document.getElementById('btn-excluir');
    
    [btnEditar, btnExcluir].forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
    });
}

// --- FUNÇÕES DE MODAL ---

function abrirModal(modo) {
    modoModal = modo;
    document.getElementById('modal-titulo').innerText = modo === 'cadastro' ? 'Novo Produto' : 'Editar Produto';
    
    const campoId = document.getElementById('prod-id');
    if (modo === 'cadastro') {
        campoId.disabled = false;
        limparCamposModal();
    } else {
        campoId.disabled = true; // Código interno fixo na edição
    }
    
    document.getElementById('modal-produto').classList.remove('hidden');
    carregarCategorias();
}

function fecharModal() {
    document.getElementById('modal-produto').classList.add('hidden');
}

async function prepararEdicao() {
    if (!produtoSelecionadoId) return;
    const res = await fetch(`/api/produtos?q=${produtoSelecionadoId}`); // Busca o produto específico
    const produtos = await res.json();
    const p = produtos.find(item => item.id === produtoSelecionadoId);
    
    if (p) {
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-barras').value = p.barras;
        document.getElementById('prod-nome').value = p.nome;
        document.getElementById('prod-custo').value = p.preco_custo;
        document.getElementById('prod-venda').value = p.preco_venda;
        document.getElementById('prod-estoque').value = p.estoque;
        
        abrirModal('edicao');
        // Pequeno delay para garantir que as categorias carregaram antes de setar a correta
        setTimeout(() => { document.getElementById('prod-categoria').value = p.categoria; }, 150);
    }
}

async function processarSalvar() {
    const dados = {
        id: parseInt(document.getElementById('prod-id').value),
        barras: document.getElementById('prod-barras').value,
        nome: document.getElementById('prod-nome').value,
        categoria: document.getElementById('prod-categoria').value,
        custo: parseFloat(document.getElementById('prod-custo').value),
        venda: parseFloat(document.getElementById('prod-venda').value),
        estoque: parseInt(document.getElementById('prod-estoque').value)
    };

    const url = modoModal === 'cadastro' ? '/api/produtos' : '/api/produtos/atualizar';
    
    const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
    });

    if (res.ok) {
        fecharModal();
        carregarTabela(campoFiltro.value); // Recarrega mantendo a busca atual
    } else {
        alert("Erro ao salvar produto. Verifique se o código interno já existe.");
    }
}

async function excluirProduto() {
    if (!produtoSelecionadoId) return;
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const res = await fetch(`/api/produtos/excluir/${produtoSelecionadoId}`, { method: 'DELETE' });
    if (res.ok) {
        desmarcarSelecao();
        carregarTabela(campoFiltro.value);
    }
}

async function carregarCategorias() {
    const res = await fetch('/api/categorias');
    const cats = await res.json();
    const select = document.getElementById('prod-categoria');
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Selecione...</option>';
    cats.forEach(c => {
        select.innerHTML += `<option value="${c.nome}">${c.nome}</option>`;
    });
    if (valorAtual) select.value = valorAtual;
}

async function addCategoria() {
    const nome = prompt("Nome da nova categoria:");
    if (!nome) return;
    await fetch('/api/categorias', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({nome})
    });
    carregarCategorias();
}

function limparCamposModal() {
    ['prod-id', 'prod-barras', 'prod-nome', 'prod-custo', 'prod-venda', 'prod-estoque'].forEach(id => {
        document.getElementById(id).value = '';
    });
}

// Inicialização
carregarTabela();