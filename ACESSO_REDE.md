# Acesso pela rede local (uso de teste)

Para a equipe acessar o sistema rodando no seu notebook, siga estes passos.
Tudo gira em torno de UMA informação: o IP do seu notebook na rede.

## 1. Descubra o IP do seu notebook

No PowerShell:

    ipconfig

Anote o "Endereço IPv4" do adaptador Wi-Fi (ou Ethernet). Exemplo: 192.168.0.105.
Daqui em diante, troque SEU_IP por esse valor.

## 2. Configure o backend (arquivo backend/.env)

Crie/edite `backend/.env` com:

    DATABASE_URL=postgresql://postgres:postgres@db:5432/garantias3d
    SECRET_KEY=uma-chave-aleatoria-qualquer-mais-longa
    CORS_ABERTO=true

`CORS_ABERTO=true` libera o acesso de qualquer máquina da rede (ok para teste).

## 3. Configure o frontend (arquivo frontend/.env)

Crie/edite `frontend/.env` com (troque SEU_IP):

    VITE_API_URL=http://SEU_IP:8000

Isso faz o frontend de todos os computadores apontar para o backend no seu
notebook, em vez de "localhost".

## 4. Libere as portas no Firewall do Windows (uma vez)

No PowerShell como Administrador:

    New-NetFirewallRule -DisplayName "Garantias3D Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
    New-NetFirewallRule -DisplayName "Garantias3D Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

## 5. Suba o projeto

    docker compose down
    docker compose up --build -d

## 6. A equipe acessa

No navegador de qualquer computador da MESMA rede:

    http://SEU_IP:5173

Login inicial: admin / admin123 (troque depois).

## Observações importantes

- Seu notebook precisa estar LIGADO e na rede para o sistema funcionar.
- O IP pode mudar quando você reconecta ao Wi-Fi. Se a equipe perder o acesso,
  rode `ipconfig` de novo e confira se o IP é o mesmo; se mudou, atualize o
  frontend/.env e suba de novo.
- Isto é uma configuração de TESTE em rede interna. Não exponha à internet sem
  uma revisão de segurança (HTTPS, senha forte, proteção do login).
