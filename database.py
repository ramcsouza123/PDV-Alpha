import sqlite3
from werkzeug.security import generate_password_hash

def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY, barras TEXT, nome TEXT,
        categoria TEXT, preco_custo REAL, preco_venda REAL, estoque INTEGER)''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE)''')
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, cpf TEXT, 
        limite REAL, saldo_devedor REAL DEFAULT 0)''')
    
    # Adicionada coluna STATUS (Finalizada ou Cancelada)
    cursor.execute('''CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER, total REAL, 
        desconto REAL, observacao TEXT, data TEXT, status TEXT DEFAULT 'Finalizada')''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS pagamentos_venda (
        venda_id INTEGER, metodo TEXT, valor REAL)''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS itens_venda (
        venda_id INTEGER, produto_id INTEGER, qtd INTEGER, preco REAL, custo REAL)''')

    cursor.execute('''CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL, nivel TEXT NOT NULL)''')

    senha_hash = generate_password_hash('123')
    try:
        cursor.execute("INSERT INTO usuarios (username, senha, nivel) VALUES (?, ?, ?)",
                       ('admin', senha_hash, 'admin'))
    except: pass

    conn.commit()
    conn.close()
    print("Banco atualizado com sucesso!")

if __name__ == "__main__":
    init_db()