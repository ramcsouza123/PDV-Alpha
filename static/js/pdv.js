// VARIÁVEIS GLOBAIS
let carrinho = [];
let pagamentosRealizados = [];
let clienteSelecionado = null;
let totalVendaGlobal = 0;
let sugestoesAtuais = [];
let indiceAtivo = -1;

// ELEMENTOS DOM
const inputBuscaProd = document.getElementById('busca-produto');
const divSugestProd = document.getElementById('sugestoes');
const inputQtd = document.getElementById('qtd-pdv');
const inputDesc = document.getElementById('desconto');
const inputAcre = document.getElementById('acrescimo');
const modalPag = document.getElementById('modal-pagamento');
const inputBuscaCliModal = document.getElementById('modal-busca-cliente');
const divSugestCli = document.getElementById('sugestoes-cliente');
const inputValorPag = document.getElementById('valor-pagar');

// ==========================================
// 1. SISTEMA DE ATALHOS DE TECLADO
// ==========================================
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fecharPagamento();
    }
    if (e.key === 'F2') {
        e.preventDefault();
        fecharPagamento();
        inputBuscaProd.focus();
        inputBuscaProd.select();
    }
    if (e.key === 'F3') {
        e.preventDefault();
        inputQtd.focus();
        inputQtd.select();
    }
    if (e.key === 'F4') {
        e.preventDefault();
        if (modalPag.classList.contains('hidden')) abrirPagamento();
        inputBuscaCliModal.focus();
    }
    if (e.key === 'F8') {
        e.preventDefault();
        inputDesc.focus();
        inputDesc.select();
    }
    if (e.key === 'F9') {
        e.preventDefault();
        if (confirm("Deseja cancelar a venda atual?")) location.reload();
    }
    if (e.key === 'F10') {
        e.preventDefault();
        const btnFinalizar = document.getElementById('btn-finalizar-venda');
        if (!modalPag.classList.contains('hidden') && !btnFinalizar.disabled) {
            confirmarVenda();
        } else {
            abrirPagamento();
        }
    }
});

// ==========================================
// 2. BUSCA E CARRINHO
// ==========================================
inputBuscaProd.addEventListener('input', async (e) => {
    const b = e.target.value;
    if (b.length < 1) { divSugestProd.classList.add('hidden'); sugestoesAtuais = []; return; }
    const res = await fetch(`/api/produtos?q=${b}`);
    sugestoesAtuais = await res.json();
    indiceAtivo = -1;
    renderizarSugestoes();
});

inputBuscaProd.addEventListener('keydown', (e) => {
    const items = divSugestProd.querySelectorAll('.item-sugestao');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        indiceAtivo = (indiceAtivo + 1) % items.length;
        atualizarDestaque(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        indiceAtivo = (indiceAtivo - 1 + items.length) % items.length;
        atualizarDestaque(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (indiceAtivo > -1 && items[indiceAtivo]) {
            adicionarAoCarrinho(sugestoesAtuais[indiceAtivo]);
        } else if (sugestoesAtuais.length > 0) {
            adicionarAoCarrinho(sugestoesAtuais[0]);
        }
    }
});

function renderizarSugestoes() {
    divSugestProd.innerHTML = '';
    if (sugestoesAtuais.length > 0) {
        divSugestProd.classList.remove('hidden');
        sugestoesAtuais.forEach((p, index) => {
            const item = document.createElement('div');
            item.className = 'item-sugestao p-4 cursor-pointer border-b border-gray-700 flex justify-between items-center text-white';
            item.innerHTML = `<div><b>${p.id}</b> - ${p.nome} <br><small class="opacity-50">Estoque: ${p.estoque}</small></div> <b>R$ ${p.preco_venda.toFixed(2)}</b>`;
            item.onclick = () => adicionarAoCarrinho(p);
            divSugestProd.appendChild(item);
        });
    } else { divSugestProd.classList.add('hidden'); }
}

function atualizarDestaque(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('bg-blue-600', idx === indiceAtivo);
        if (idx === indiceAtivo) item.scrollIntoView({ block: 'nearest' });
    });
}

function adicionarAoCarrinho(p) {
    const qtd = parseFloat(inputQtd.value) || 1;
    carrinho.push({ 
        id: p.id, 
        nome: p.nome, 
        preco: p.preco_venda, 
        custo: p.preco_custo, 
        qtd: qtd, 
        subtotal: p.preco_venda * qtd 
    });
    inputBuscaProd.value = ''; inputQtd.value = 1;
    divSugestProd.classList.add('hidden');
    atualizarTabela();
    inputBuscaProd.focus();
}

function atualizarTabela() {
    const body = document.getElementById('carrinho-corpo');
    document.getElementById('carrinho-vazio').classList.toggle('hidden', carrinho.length > 0);
    body.innerHTML = '';
    let sub = 0;
    carrinho.forEach((i, idx) => {
        sub += i.subtotal;
        body.innerHTML += `<tr class="border-t border-gray-700">
            <td class="p-3">${i.nome}</td><td class="p-3 text-center">${i.qtd}</td>
            <td class="p-3 text-right font-mono">R$ ${i.preco.toFixed(2)}</td>
            <td class="p-3 text-right font-bold font-mono">R$ ${i.subtotal.toFixed(2)}</td>
            <td class="p-3 text-center"><button onclick="carrinho.splice(${idx},1);atualizarTabela()" class="text-red-500">✖</button></td>
        </tr>`;
    });
    const desc = parseFloat(inputDesc.value) || 0;
    const acre = parseFloat(inputAcre.value) || 0;
    totalVendaGlobal = (sub + acre) - desc;
    document.getElementById('subtotal').innerText = `R$ ${sub.toFixed(2)}`;
    document.getElementById('total-pagar').innerText = `R$ ${Math.max(0, totalVendaGlobal).toFixed(2)}`;
}

inputDesc.addEventListener('input', atualizarTabela);
inputAcre.addEventListener('input', atualizarTabela);

// ==========================================
// 3. PAGAMENTOS E CLIENTES
// ==========================================
inputBuscaCliModal.addEventListener('input', async (e) => {
    const b = e.target.value;
    if (b.length < 1) { divSugestCli.classList.add('hidden'); return; }
    const res = await fetch(`/api/clientes?q=${b}`);
    const clis = await res.json();
    divSugestCli.innerHTML = '';
    clis.forEach(c => {
        const item = document.createElement('div');
        item.className = 'p-3 hover:bg-blue-600 cursor-pointer border-b border-gray-700 text-white';
        item.innerHTML = `<b>${c.nome}</b> <br><small class="opacity-60">Limite: R$ ${(c.limite - c.saldo_devedor).toFixed(2)}</small>`;
        item.onclick = () => {
            clienteSelecionado = c;
            document.getElementById('nome-cliente-pdv').innerText = c.nome;
            document.getElementById('cliente-selecionado-msg').innerText = `👤 Selecionado: ${c.nome}`;
            divSugestCli.classList.add('hidden'); inputBuscaCliModal.value = '';
            inputValorPag.focus();
        };
        divSugestCli.appendChild(item);
    });
    if (clis.length > 0) divSugestCli.classList.remove('hidden');
});

function abrirPagamento() {
    if (carrinho.length === 0) return;
    pagamentosRealizados = [];
    atualizarUIFatura();
    modalPag.classList.remove('hidden');
    inputValorPag.focus();
}

function fecharPagamento() { modalPag.classList.add('hidden'); inputBuscaProd.focus(); }

function adicionarPagamento() {
    const metodo = document.getElementById('metodo-pagamento').value;
    const valor = parseFloat(inputValorPag.value) || 0;
    if (valor <= 0) return;

    const totalPago = pagamentosRealizados.reduce((acc, p) => acc + p.valor, 0);
    const restante = totalVendaGlobal - totalPago;

    if (metodo === 'Fiado') {
        if (!clienteSelecionado) return alert("Identifique o cliente primeiro!");
        if (valor > (clienteSelecionado.limite - clienteSelecionado.saldo_devedor + 0.01)) return alert("Limite de crédito insuficiente!");
    }
    if (metodo !== 'Dinheiro' && valor > (restante + 0.01)) return alert("Este método não permite troco!");

    pagamentosRealizados.push({ metodo, valor });
    atualizarUIFatura();
}

inputValorPag.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarPagamento(); } });

function atualizarUIFatura() {
    const totalPago = pagamentosRealizados.reduce((acc, p) => acc + p.valor, 0);
    const restante = Math.max(0, totalVendaGlobal - totalPago);
    const troco = Math.max(0, totalPago - totalVendaGlobal);

    document.getElementById('pag-restante').innerText = `R$ ${restante.toFixed(2)}`;
    document.getElementById('valor-troco').innerText = `R$ ${troco.toFixed(2)}`;
    inputValorPag.value = restante > 0 ? restante.toFixed(2) : "0.00";

    const listBody = document.getElementById('lista-pagamentos');
    listBody.innerHTML = '';
    pagamentosRealizados.forEach((p, idx) => {
        listBody.innerHTML += `<tr class="hover:bg-gray-800"><td class="p-2">${p.metodo}</td><td class="p-2 text-right font-mono">R$ ${p.valor.toFixed(2)}</td><td class="p-1 text-center"><button onclick="pagamentosRealizados.splice(${idx},1);atualizarUIFatura()" class="text-red-500">✖</button></td></tr>`;
    });

    const btn = document.getElementById('btn-finalizar-venda');
    const pronto = totalPago >= (totalVendaGlobal - 0.01);
    btn.disabled = !pronto;
    btn.classList.toggle('bg-green-600', pronto);
    btn.classList.toggle('opacity-50', !pronto);
    btn.classList.toggle('cursor-not-allowed', !pronto);
}

async function confirmarVenda() {
    const payload = {
        cliente_id: clienteSelecionado ? clienteSelecionado.id : null,
        total: totalVendaGlobal,
        desconto: parseFloat(inputDesc.value) || 0,
        acrescimo: parseFloat(inputAcre.value) || 0,
        observacao: document.getElementById('modal-observacao').value,
        itens: carrinho,
        pagamentos: pagamentosRealizados
    };

    const res = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        const data = await res.json();
        if (confirm("Venda realizada! Imprimir cupom?")) imprimirCupom(data.venda_id, payload);
        location.reload();
    }
}

function imprimirCupom(vendaId, dados) {
    document.getElementById('print-venda-id').innerText = vendaId;
    document.getElementById('print-data').innerText = new Date().toLocaleString('pt-BR');
    document.getElementById('print-cliente').innerText = clienteSelecionado ? clienteSelecionado.nome : "Consumidor Final";
    const body = document.getElementById('print-itens'); body.innerHTML = '';
    dados.itens.forEach(i => body.innerHTML += `<tr><td>${i.nome}</td><td class="text-center">${i.qtd}</td><td class="text-right">R$ ${i.subtotal.toFixed(2)}</td></tr>`);
    document.getElementById('print-subtotal').innerText = `R$ ${dados.itens.reduce((a,b)=>a+b.subtotal,0).toFixed(2)}`;
    document.getElementById('print-ajustes').innerText = `R$ ${(dados.acrescimo - dados.desconto).toFixed(2)}`;
    document.getElementById('print-total').innerText = `R$ ${dados.total.toFixed(2)}`;
    const pBody = document.getElementById('print-pagamentos'); pBody.innerHTML = '';
    dados.pagamentos.forEach(p => pBody.innerHTML += `<div class="flex justify-between"><span>${p.metodo}</span><span>R$ ${p.valor.toFixed(2)}</span></div>`);
    if(dados.observacao) {
        document.getElementById('print-obs-area').classList.remove('hidden');
        document.getElementById('print-obs-text').innerText = dados.observacao;
    }
    window.print();
}