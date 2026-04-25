let vendaSelecionadaId = null;

async function carregarDashboardEstoque() {
    const res = await fetch('/api/relatorios/estoque-resumo');
    const data = await res.json();
    const custo = data.custo_total || 0;
    const venda = data.venda_total || 0;
    document.getElementById('card-custo-estoque').innerText = `R$ ${custo.toFixed(2)}`;
    document.getElementById('card-venda-estoque').innerText = `R$ ${venda.toFixed(2)}`;
    document.getElementById('card-lucro-estoque').innerText = `R$ ${(venda - custo).toFixed(2)}`;
}

async function carregarVendas(tipo) {
    let url = `/api/relatorios/vendas?periodo=${tipo}`;
    if (tipo === 'periodo') {
        const ini = document.getElementById('filtro-inicio').value;
        const fim = document.getElementById('filtro-fim').value;
        if (!ini || !fim) return alert("Selecione o período!");
        url += `&inicio=${ini}&fim=${fim}`;
    }

    const res = await fetch(url);
    const vendas = await res.json();
    const tbody = document.getElementById('tabela-vendas');
    tbody.innerHTML = '';
    
    let totalFin = 0; let lucroFin = 0;

    vendas.forEach(v => {
        const isCancelada = v.status === 'Cancelada';
        if (!isCancelada) {
            totalFin += v.total;
            lucroFin += v.lucro_bruto;
        }

        const partesData = v.data.split(' ');
        const dYMD = partesData[0].split('-');
        const dataFormatada = `${dYMD[2]}/${dYMD[1]}/${dYMD[0]} ${partesData[1]}`;

        const tr = document.createElement('tr');
        tr.className = `hover:bg-gray-700/30 transition border-t border-gray-700 cursor-pointer ${isCancelada ? 'opacity-30 grayscale italic' : ''}`;
        tr.id = `linha-venda-${v.id}`;
        tr.onclick = () => selecionarVenda(v.id, isCancelada);

        tr.innerHTML = `
            <td class="p-4 text-gray-500 font-mono">#${v.id}</td>
            <td class="p-4 ${isCancelada ? 'line-through' : ''}">${dataFormatada}</td>
            <td class="p-4 font-bold ${isCancelada ? 'line-through' : ''}">${v.nome_cliente || 'Consumidor Final'}</td>
            <td class="p-4 text-[10px] uppercase">${v.metodos}</td>
            <td class="p-4 text-right font-bold text-white">R$ ${v.total.toFixed(2)}</td>
            <td class="p-4 text-right font-bold text-green-500">${isCancelada ? 'R$ 0.00' : 'R$ '+v.lucro_bruto.toFixed(2)}</td>
            <td class="p-4 text-center">
                <span class="px-2 py-1 rounded text-[9px] font-black uppercase ${isCancelada ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}">
                    ${v.status}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('resumo-venda-periodo').innerText = `R$ ${totalFin.toFixed(2)}`;
    document.getElementById('resumo-lucro-periodo').innerText = `Lucro: R$ ${lucroFin.toFixed(2)}`;
    desmarcarVenda();
}

function selecionarVenda(id, cancelada) {
    if (vendaSelecionadaId === id) { desmarcarVenda(); return; }
    
    vendaSelecionadaId = id;
    document.querySelectorAll('#tabela-vendas tr').forEach(t => t.classList.remove('bg-blue-900/40', 'border-l-4', 'border-l-blue-500'));
    
    const linha = document.getElementById(`linha-venda-${id}`);
    linha.classList.add('bg-blue-900/40', 'border-l-4', 'border-l-blue-500');
    
    const btn = document.getElementById('btn-cancelar-venda');
    btn.disabled = cancelada;
    btn.classList.toggle('opacity-50', cancelada);
    btn.classList.toggle('cursor-not-allowed', cancelada);
}

function desmarcarVenda() {
    vendaSelecionadaId = null;
    const btn = document.getElementById('btn-cancelar-venda');
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    document.querySelectorAll('#tabela-vendas tr').forEach(t => t.classList.remove('bg-blue-900/40', 'border-l-4', 'border-l-blue-500'));
}

async function cancelarVenda() {
    if (!vendaSelecionadaId) return;
    if (!confirm(`Deseja cancelar a venda #${vendaSelecionadaId}? Itens voltarão ao estoque e dívidas serão estornadas.`)) return;

    const res = await fetch(`/api/vendas/cancelar/${vendaSelecionadaId}`, { method: 'POST' });
    if (res.ok) {
        alert("Venda cancelada!");
        carregarVendas('hoje');
        carregarDashboardEstoque();
    } else {
        const err = await res.json();
        alert(err.msg);
    }
}

// Início
const hoje = new Date().toISOString().split('T')[0];
document.getElementById('filtro-inicio').value = hoje;
document.getElementById('filtro-fim').value = hoje;
carregarDashboardEstoque();
carregarVendas('hoje');