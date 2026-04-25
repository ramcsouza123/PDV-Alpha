let clienteSelecionadoId = null;
let clienteDadosAtuais = null;
let modoModalCli = 'cadastro';

async function carregarTabela(busca = '') {
    const url = busca ? `/api/clientes?q=${busca}` : '/api/clientes';
    const res = await fetch(url);
    const clientes = await res.json();
    const tbody = document.getElementById('tabela-clientes');
    tbody.innerHTML = '';

    clientes.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = 'border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer transition';
        tr.id = `linha-cli-${c.id}`;
        if (c.id === clienteSelecionadoId) tr.classList.add('bg-blue-900/40', 'border-l-4', 'border-l-blue-500');

        tr.innerHTML = `
            <td class="p-4 text-gray-500">#${c.id}</td>
            <td class="p-4 font-bold text-white">${c.nome}</td>
            <td class="p-4 text-gray-400">${c.cpf || '---'}</td>
            <td class="p-4 text-right text-red-400 font-mono">R$ ${c.saldo_devedor.toFixed(2)}</td>
            <td class="p-4 text-right text-green-400 font-bold font-mono">R$ ${(c.limite - c.saldo_devedor).toFixed(2)}</td>
        `;
        tr.onclick = () => selecionarLinha(c);
        tbody.appendChild(tr);
    });
}

function selecionarLinha(c) {
    if (clienteSelecionadoId === c.id) {
        clienteSelecionadoId = null;
        clienteDadosAtuais = null;
    } else {
        clienteSelecionadoId = c.id;
        clienteDadosAtuais = c;
    }
    carregarTabela(document.getElementById('filtro-cliente').value);
    
    // Atualiza botão extrato (comum a todos)
    const btnExtrato = document.getElementById('btn-extrato');
    btnExtrato.disabled = !clienteSelecionadoId;
    btnExtrato.classList.toggle('opacity-50', !clienteSelecionadoId);
    btnExtrato.classList.toggle('cursor-not-allowed', !clienteSelecionadoId);

    // Atualiza botões admin (apenas se existirem na tela)
    const btnEdit = document.getElementById('btn-editar-cli');
    const btnExcluir = document.getElementById('btn-excluir-cli');

    if(btnEdit) {
        btnEdit.disabled = !clienteSelecionadoId;
        btnEdit.classList.toggle('opacity-50', !clienteSelecionadoId);
        btnEdit.classList.toggle('cursor-not-allowed', !clienteSelecionadoId);
    }
    if(btnExcluir) {
        btnExcluir.disabled = !clienteSelecionadoId;
        btnExcluir.classList.toggle('opacity-50', !clienteSelecionadoId);
        btnExcluir.classList.toggle('cursor-not-allowed', !clienteSelecionadoId);
    }
}

// --- FUNÇÕES DE MODAL (Só para Admin) ---
function abrirModal(modo) {
    modoModalCli = modo;
    const tit = document.getElementById('modal-titulo-cli');
    if(tit) tit.innerText = modo === 'cadastro' ? 'Novo Cliente' : 'Editar Cliente';
    if (modo === 'cadastro') limparCamposModal();
    const modal = document.getElementById('modal-cliente');
    if(modal) modal.classList.remove('hidden');
}

function fecharModal() { 
    const modal = document.getElementById('modal-cliente');
    if(modal) modal.classList.add('hidden'); 
}

async function prepararEdicao() {
    if (!clienteSelecionadoId) return;
    const res = await fetch(`/api/clientes/${clienteSelecionadoId}`);
    const c = await res.json();
    document.getElementById('cli-id-db').value = c.id;
    document.getElementById('cli-nome').value = c.nome;
    document.getElementById('cli-cpf').value = c.cpf;
    document.getElementById('cli-limite').value = c.limite;
    abrirModal('edicao');
}

async function processarSalvar() {
    const dados = {
        id: document.getElementById('cli-id-db').value,
        nome: document.getElementById('cli-nome').value,
        cpf: document.getElementById('cli-cpf').value,
        limite: parseFloat(document.getElementById('cli-limite').value || 0)
    };
    const url = modoModalCli === 'cadastro' ? '/api/clientes' : '/api/clientes/atualizar';
    const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
    });
    if (res.ok) { fecharModal(); carregarTabela(); }
    else { const err = await res.json(); alert(err.msg); }
}

async function excluirCliente() {
    if (!clienteSelecionadoId || !confirm("Deseja excluir este cliente?")) return;
    const res = await fetch(`/api/clientes/excluir/${clienteSelecionadoId}`, { method: 'DELETE' });
    if (res.ok) { clienteSelecionadoId = null; carregarTabela(); } 
    else { const err = await res.json(); alert(err.msg); }
}

// --- LÓGICA EXTRATO (Geral) ---
async function abrirExtrato() {
    if (!clienteDadosAtuais) return;
    document.getElementById('extrato-nome-cli').innerText = `Histórico: ${clienteDadosAtuais.nome}`;
    document.getElementById('extrato-divida-total').innerText = `Dívida Atual: R$ ${clienteDadosAtuais.saldo_devedor.toFixed(2)}`;
    document.getElementById('pag-divida-valor').value = clienteDadosAtuais.saldo_devedor.toFixed(2);
    document.getElementById('detalhes-venda-itens').innerHTML = '<li class="text-gray-600 italic">Clique em uma compra...</li>';

    const res = await fetch(`/api/clientes/${clienteSelecionadoId}/extrato`);
    const extrato = await res.json();
    const tbody = document.getElementById('lista-extrato');
    tbody.innerHTML = '';

    extrato.forEach(v => {
        const d = v.data.split(' ');
        const ym = d[0].split('-');
        const dataFormatada = `${ym[2]}/${ym[1]} ${d[1].substring(0,5)}`;
        
        const isCompra = v.metodo === 'Fiado';
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-blue-900/30 transition border-b border-gray-700';
        tr.innerHTML = `
            <td class="p-3 text-[10px] text-gray-400 font-mono">${dataFormatada}</td>
            <td class="p-3 text-[11px] font-bold ${isCompra ? 'text-red-400' : 'text-green-400'}">${isCompra ? '🔻 COMPRA' : '🟢 REC. ('+v.metodo+')'}</td>
            <td class="p-3 text-right font-bold font-mono ${isCompra ? 'text-red-400' : 'text-green-400'}">R$ ${v.valor_movido.toFixed(2)}</td>
        `;
        tr.onclick = isCompra ? () => verItensVenda(v.id) : () => {
            document.getElementById('detalhes-venda-itens').innerHTML = '<li class="bg-green-900/20 p-3 rounded text-green-400 text-xs">Abatimento de dívida.</li>';
        };
        tbody.appendChild(tr);
    });
    document.getElementById('modal-extrato').classList.remove('hidden');
}

async function verItensVenda(vid) {
    const res = await fetch(`/api/vendas/${vid}/itens`);
    const itens = await res.json();
    const lista = document.getElementById('detalhes-venda-itens');
    lista.innerHTML = '';
    itens.forEach(i => {
        const li = document.createElement('li');
        li.className = 'bg-gray-800 p-2 rounded border-l-2 border-blue-500 flex justify-between';
        li.innerHTML = `<span>${i.qtd}x ${i.nome}</span> <span class="text-gray-500">R$ ${(i.qtd*i.preco).toFixed(2)}</span>`;
        lista.appendChild(li);
    });
}

async function confirmarPagamentoDivida() {
    const valor = parseFloat(document.getElementById('pag-divida-valor').value);
    const metodo = document.getElementById('pag-divida-metodo').value;
    if (valor <= 0 || valor > (clienteDadosAtuais.saldo_devedor + 0.01)) return alert("Valor inválido!");
    
    const res = await fetch('/api/clientes/pagar-debito', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: clienteSelecionadoId, valor, metodo })
    });
    if (res.ok) { alert("Recebimento registrado!"); fecharExtrato(); location.reload(); }
}

function fecharExtrato() { document.getElementById('modal-extrato').classList.add('hidden'); }
function limparCamposModal() { 
    const ids = ['cli-id-db', 'cli-nome', 'cli-cpf', 'cli-limite'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
}

document.getElementById('filtro-cliente').addEventListener('input', (e) => carregarTabela(e.target.value));
carregarTabela();