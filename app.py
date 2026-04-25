import os
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'chave_mestra_pdv_alpha_pro_2_0'

# Configuração de caminhos para funcionar no PythonAnywhere
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

def get_db():
    db_path = os.path.join(BASE_DIR, 'database.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# --- SEGURANÇA ---
@app.before_request
def verificar_login():
    rotas_livres = ['login', 'static', 'api_login']
    if 'usuario' not in session and request.endpoint not in rotas_livres:
        return redirect(url_for('login'))

@app.route('/login')
def login(): return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    d = request.json
    db = get_db()
    user = db.execute("SELECT * FROM usuarios WHERE username = ?", (d['username'].lower(),)).fetchone()
    db.close()
    if user and check_password_hash(user['senha'], d['senha']):
        session['usuario'] = user['username']
        session['nivel'] = user['nivel']
        return jsonify({"status": "sucesso"})
    return jsonify({"status": "erro", "msg": "Usuário ou senha inválidos"}), 401

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- NAVEGAÇÃO ---
@app.route('/')
def index(): return render_template('pdv.html')

@app.route('/clientes')
def clientes(): return render_template('clientes.html')

@app.route('/estoque')
def estoque():
    if session.get('nivel') != 'admin': return redirect(url_for('index'))
    return render_template('estoque.html')

@app.route('/relatorios')
def relatorios():
    if session.get('nivel') != 'admin': return redirect(url_for('index'))
    return render_template('relatorios.html')

@app.route('/usuarios')
def usuarios():
    if session.get('nivel') != 'admin': return redirect(url_for('index'))
    return render_template('usuarios.html')

# --- APIs DO SISTEMA ---
@app.route('/api/usuarios', methods=['GET', 'POST'])
def gerenciar_usuarios():
    if session.get('nivel') != 'admin': return jsonify({"msg": "Negado"}), 403
    db = get_db()
    if request.method == 'POST':
        d = request.json
        senha_hash = generate_password_hash(d['senha'])
        try:
            db.execute("INSERT INTO usuarios (username, senha, nivel) VALUES (?, ?, ?)", (d['username'].lower(), senha_hash, d['nivel']))
            db.commit()
            return jsonify({"status": "sucesso"})
        except: return jsonify({"msg": "Usuário já existe"}), 400
    users = db.execute("SELECT id, username, nivel FROM usuarios").fetchall()
    db.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/usuarios/excluir/<int:id>', methods=['DELETE'])
def excluir_usuario(id):
    if session.get('nivel') != 'admin': return jsonify({"msg": "Negado"}), 403
    db = get_db()
    user = db.execute("SELECT username FROM usuarios WHERE id = ?", (id,)).fetchone()
    if user['username'] in ['admin', session['usuario']]: return jsonify({"msg": "Proibido"}), 400
    db.execute("DELETE FROM usuarios WHERE id = ?", (id,))
    db.commit()
    db.close()
    return jsonify({"status": "sucesso"})

@app.route('/api/categorias', methods=['GET', 'POST'])
def gerenciar_categorias():
    db = get_db()
    if request.method == 'POST':
        nome = request.json.get('nome')
        try:
            db.execute("INSERT INTO categorias (nome) VALUES (?)", (nome.strip().capitalize(),))
            db.commit()
            db.close()
            return jsonify({"status": "sucesso"})
        except: return jsonify({"status": "erro"}), 400
    cats = db.execute("SELECT * FROM categorias ORDER BY nome").fetchall()
    db.close()
    return jsonify([dict(c) for c in cats])

@app.route('/api/produtos', methods=['GET', 'POST'])
def gerenciar_produtos():
    db = get_db()
    if request.method == 'GET':
        q = request.args.get('q', '')
        sql = "SELECT * FROM produtos WHERE nome LIKE ? OR id LIKE ? OR barras = ?" if q else "SELECT * FROM produtos ORDER BY nome"
        prods = db.execute(sql, (f'%{q}%', f'%{q}%', q)).fetchall() if q else db.execute(sql).fetchall()
        db.close()
        return jsonify([dict(p) for p in prods])
    if request.method == 'POST':
        if session.get('nivel') != 'admin': return jsonify({"msg": "Acesso negado"}), 403
        d = request.json
        db.execute("INSERT INTO produtos VALUES (?,?,?,?,?,?,?)", (d['id'], d['barras'], d['nome'], d['categoria'], d['custo'], d['venda'], d['estoque']))
        db.commit(); db.close(); return jsonify({"status": "sucesso"})

@app.route('/api/produtos/<int:id>')
def obter_produto(id):
    db = get_db(); p = db.execute("SELECT * FROM produtos WHERE id=?", (id,)).fetchone(); db.close(); return jsonify(dict(p))

@app.route('/api/produtos/atualizar', methods=['POST'])
def atualizar_produto():
    if session.get('nivel') != 'admin': return jsonify({"msg": "Acesso negado"}), 403
    d = request.json
    db = get_db()
    db.execute("UPDATE produtos SET barras=?, nome=?, categoria=?, preco_custo=?, preco_venda=?, estoque=? WHERE id=?", (d['barras'], d['nome'], d['categoria'], d['custo'], d['venda'], d['estoque'], d['id']))
    db.commit(); db.close(); return jsonify({"status": "sucesso"})

@app.route('/api/produtos/excluir/<int:id>', methods=['DELETE'])
def excluir_produto(id):
    if session.get('nivel') != 'admin': return jsonify({"msg": "Acesso negado"}), 403
    db = get_db(); db.execute("DELETE FROM produtos WHERE id=?", (id,)); db.commit(); db.close(); return jsonify({"status": "sucesso"})

@app.route('/api/clientes', methods=['GET', 'POST'])
def gerenciar_clientes():
    db = get_db()
    if request.method == 'GET':
        q = request.args.get('q', '')
        sql = "SELECT * FROM clientes WHERE nome LIKE ? OR cpf LIKE ?" if q else "SELECT * FROM clientes ORDER BY nome"
        clis = db.execute(sql, (f'%{q}%', f'%{q}%')).fetchall() if q else db.execute(sql).fetchall()
        db.close()
        return jsonify([dict(c) for c in clis])
    if request.method == 'POST':
        if session.get('nivel') != 'admin': return jsonify({"msg": "Acesso negado"}), 403
        d = request.json
        db.execute("INSERT INTO clientes (nome, cpf, limite) VALUES (?,?,?)", (d['nome'], d['cpf'], d['limite']))
        db.commit(); db.close(); return jsonify({"status": "sucesso"})

@app.route('/api/clientes/<int:id>')
def obter_cliente(id):
    db = get_db(); c = db.execute("SELECT * FROM clientes WHERE id=?", (id,)).fetchone(); db.close(); return jsonify(dict(c))

@app.route('/api/clientes/atualizar', methods=['POST'])
def atualizar_cliente():
    if session.get('nivel') != 'admin': return jsonify({"msg": "Acesso negado"}), 403
    d = request.json
    db = get_db()
    db.execute("UPDATE clientes SET nome=?, cpf=?, limite=? WHERE id=?", (d['nome'], d['cpf'], d['limite'], d['id']))
    db.commit(); db.close(); return jsonify({"status": "sucesso"})

@app.route('/api/clientes/excluir/<int:id>', methods=['DELETE'])
def excluir_cliente(id):
    if session.get('nivel') != 'admin': return jsonify({"msg": "Acesso negado"}), 403
    db = get_db()
    cli = db.execute("SELECT saldo_devedor FROM clientes WHERE id=?", (id,)).fetchone()
    if cli['saldo_devedor'] > 0: return jsonify({"msg":"Dívida ativa"}), 400
    db.execute("DELETE FROM clientes WHERE id=?", (id,)); db.commit(); db.close(); return jsonify({"status": "sucesso"})

@app.route('/api/clientes/<int:id>/extrato')
def obter_extrato(id):
    db = get_db()
    movs = db.execute("SELECT v.id, v.data, v.total, p.valor as valor_movido, p.metodo FROM vendas v JOIN pagamentos_venda p ON v.id = p.venda_id WHERE v.cliente_id = ? ORDER BY v.data DESC", (id,)).fetchall()
    db.close()
    return jsonify([dict(m) for m in movs])

@app.route('/api/clientes/pagar-debito', methods=['POST'])
def pagar_debito():
    d = request.json
    db = get_db(); data_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    db.execute("UPDATE clientes SET saldo_devedor = saldo_devedor - ? WHERE id=?", (d['valor'], d['id']))
    res = db.execute("INSERT INTO vendas (cliente_id, total, desconto, observacao, data) VALUES (?,?,0,'PAGAMENTO DÍVIDA',?)", (d['id'], d['valor'], data_at))
    db.execute("INSERT INTO pagamentos_venda (venda_id, metodo, valor) VALUES (?,?,?)", (res.lastrowid, d['metodo'], d['valor']))
    db.commit(); db.close(); return jsonify({"status": "sucesso"})

@app.route('/api/vendas', methods=['POST'])
def api_vendas():
    d = request.json
    db = get_db(); data_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        res = db.execute("INSERT INTO vendas (cliente_id, total, desconto, observacao, data) VALUES (?,?,?,?,?)", (d.get('cliente_id'), d['total'], d['desconto'], d.get('observacao'), data_at))
        vid = res.lastrowid
        for i in d['itens']:
            db.execute("INSERT INTO itens_venda VALUES (?,?,?,?,?)", (vid, i['id'], i['qtd'], i['preco'], i['custo']))
            db.execute("UPDATE produtos SET estoque = estoque - ? WHERE id = ?", (i['qtd'], i['id']))
        for p in d['pagamentos']:
            db.execute("INSERT INTO pagamentos_venda (venda_id, metodo, valor) VALUES (?,?,?)", (vid, p['metodo'], p['valor']))
            if p['metodo'] == 'Fiado' and d.get('cliente_id'):
                db.execute("UPDATE clientes SET saldo_devedor = saldo_devedor + ? WHERE id = ?", (p['valor'], d['cliente_id']))
        db.commit(); db.close(); return jsonify({"status": "sucesso", "venda_id": vid})
    except Exception as e: return jsonify({"status": "erro", "msg": str(e)}), 500

@app.route('/api/vendas/cancelar/<int:id>', methods=['POST'])
def cancelar_venda(id):
    if session.get('nivel') != 'admin': return jsonify({"msg": "Negado"}), 403
    db = get_db()
    try:
        venda = db.execute("SELECT * FROM vendas WHERE id = ?", (id,)).fetchone()
        if not venda or venda['status'] == 'Cancelada': return jsonify({"msg": "Erro"}), 400
        itens = db.execute("SELECT produto_id, qtd FROM itens_venda WHERE venda_id = ?", (id,)).fetchall()
        for i in itens: db.execute("UPDATE produtos SET estoque = estoque + ? WHERE id = ?", (i['qtd'], i['produto_id']))
        pagos = db.execute("SELECT metodo, valor FROM pagamentos_venda WHERE venda_id = ?", (id,)).fetchall()
        for p in pagos:
            if p['metodo'] == 'Fiado' and venda['cliente_id']:
                db.execute("UPDATE clientes SET saldo_devedor = saldo_devedor - ? WHERE id = ?", (p['valor'], venda['cliente_id']))
        db.execute("UPDATE vendas SET status = 'Cancelada' WHERE id = ?", (id,))
        db.commit(); return jsonify({"status": "sucesso"})
    finally: db.close()

@app.route('/api/vendas/<int:id>/itens')
def obter_itens_venda(id):
    db = get_db(); itens = db.execute("SELECT p.nome, iv.qtd, iv.preco FROM itens_venda iv JOIN produtos p ON iv.produto_id = p.id WHERE iv.venda_id = ?", (id,)).fetchall(); db.close(); return jsonify([dict(i) for i in itens])

@app.route('/api/relatorios/estoque-resumo')
def rel_est():
    db = get_db(); res = db.execute("SELECT SUM(preco_custo*estoque) as custo_total, SUM(preco_venda*estoque) as venda_total FROM produtos").fetchone(); db.close(); return jsonify(dict(res))

@app.route('/api/relatorios/vendas')
def rel_ven():
    p = request.args.get('periodo', 'hoje'); data_ini = request.args.get('inicio', ''); data_fim = request.args.get('fim', '')
    db = get_db()
    query = "SELECT v.id, v.data, v.total, v.desconto, v.observacao, v.status, c.nome as nome_cliente, (SELECT GROUP_CONCAT(metodo, ' + ') FROM pagamentos_venda WHERE venda_id = v.id) as metodos, SUM((iv.preco - iv.custo) * iv.qtd) - v.desconto as lucro_bruto FROM vendas v LEFT JOIN clientes c ON v.cliente_id = c.id JOIN itens_venda iv ON v.id = iv.venda_id"
    params = []
    if data_ini and data_fim: query += " WHERE date(v.data) BETWEEN ? AND ?"; params.extend([data_ini, data_fim])
    elif p == 'hoje': query += " WHERE v.data LIKE ?"; params.append(f"{datetime.now().strftime('%Y-%m-%d')}%")
    elif p == 'mes': query += " WHERE v.data LIKE ?"; params.append(f"{datetime.now().strftime('%Y-%m')}%")
    query += " GROUP BY v.id ORDER BY v.id DESC"
    vendas = db.execute(query, params).fetchall()
    db.close()
    return jsonify([dict(v) for v in vendas])

if __name__ == '__main__':
    # Para rodar localmente no seu IP
    app.run(debug=True, host='0.0.0.0', port=5000)