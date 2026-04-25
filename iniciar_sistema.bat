@echo off
title Iniciando PDV Alpha
echo Aguarde, o sistema esta iniciando...

:: Inicia o servidor Python em uma janela minimizada
start /min python app.py

:: Aguarda 2 segundos para o servidor ligar
timeout /t 2 /nobreak >nul

:: Abre o navegador no modo "Aplicativo" (sem barra de enderecos)
:: Tenta abrir com o Chrome primeiro, se nao tiver, abre o padrao
start chrome --app=http://127.0.0.1:5000 || start http://127.0.0.1:5000

exit