# Documentação de Uso da WhatsApp API

Esta documentação descreve como interagir programaticamente com a WhatsApp API, focando nas rotas disponíveis, seus parâmetros de requisição, formatos de resposta e exemplos de integração.

## 1. Autenticação

Todas as rotas da API (exceto a rota raiz `/`) exigem autenticação via **API Key**. A chave deve ser enviada no cabeçalho `Authorization` no formato `Bearer Token`.

-   **Cabeçalho:** `Authorization`
-   **Valor:** `Bearer <SUA_API_KEY>`

**Exemplo de Cabeçalho:**
```
Authorization: Bearer minha_chave_secreta_123
```

## 2. Visão Geral das Rotas

| Método | Rota               | Descrição                               |
| :----- | :----------------- | :-------------------------------------- |
| `POST` | `/api/connect`     | Inicia o processo de conexão com o WhatsApp. |
| `GET`  | `/api/qrcode`      | Obtém o QR Code para autenticação da sessão. |
| `GET`  | `/api/status`      | Verifica o status atual da conexão com o WhatsApp. |
| `POST` | `/api/send-message`| Envia uma mensagem para um número específico. |

## 3. Detalhes das Rotas

### 3.1. Iniciar Conexão (`POST /api/connect`)

Esta rota inicia o processo de conexão do Baileys com o WhatsApp. É o primeiro passo para obter o QR Code e autenticar a sessão.

-   **URL:** `<URL_BASE_DA_API>/api/connect`
-   **Método:** `POST`
-   **Headers:**
    -   `Authorization: Bearer <SUA_API_KEY>`
-   **Body:** Vazio

**Exemplo de Requisição (cURL):**
```bash
curl -X POST <URL_BASE_DA_API>/api/connect \
  -H "Authorization: Bearer sua_chave_secreta"
```

**Exemplo de Resposta (Sucesso):**
```json
{
  "success": true,
  "message": "Tentativa de conexão iniciada",
  "data": {
    "status": "connecting"
  }
}
```

**Exemplo de Resposta (Erro - API Key Inválida):**
```json
{
  "success": false,
  "error": "API Key inválida."
}
```

### 3.2. Obter QR Code (`GET /api/qrcode`)

Esta rota retorna o QR Code necessário para autenticar a sessão do WhatsApp. O QR Code é retornado como uma imagem Base64 e também como texto.

-   **URL:** `<URL_BASE_DA_API>/api/qrcode`
-   **Método:** `GET`
-   **Headers:**
    -   `Authorization: Bearer <SUA_API_KEY>`

**Exemplo de Requisição (cURL):**
```bash
curl <URL_BASE_DA_API>/api/qrcode \
  -H "Authorization: Bearer sua_chave_secreta"
```

**Exemplo de Resposta (Sucesso - QR Code Disponível):**
```json
{
  "success": true,
  "data": {
    "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "qrcode_text": "1@ABC123...",
    "status": "connecting"
  }
}
```

**Exemplo de Resposta (Sucesso - QR Code Não Disponível / Já Conectado):**
```json
{
  "success": true,
  "message": "Nenhum QR Code disponível. WhatsApp pode já estar conectado.",
  "data": {
    "qrcode": null,
    "qrcode_text": null,
    "status": "connected"
  }
}
```

### 3.3. Verificar Status da Conexão (`GET /api/status`)

Esta rota permite verificar o status atual da conexão do Baileys com o WhatsApp.

-   **URL:** `<URL_BASE_DA_API>/api/status`
-   **Método:** `GET`
-   **Headers:**
    -   `Authorization: Bearer <SUA_API_KEY>`

**Exemplo de Requisição (cURL):**
```bash
curl <URL_BASE_DA_API>/api/status \
  -H "Authorization: Bearer sua_chave_secreta"
```

**Exemplo de Resposta (Sucesso - Conectado):**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "connected": true,
    "timestamp": "2025-08-20T10:30:00.000Z"
  }
}
```

**Exemplo de Resposta (Sucesso - Desconectado):**
```json
{
  "success": true,
  "data": {
    "status": "disconnected",
    "connected": false,
    "timestamp": "2025-08-20T10:30:00.000Z"
  }
}
```

**Possíveis Valores para `status`:**
-   `disconnected`: A sessão do WhatsApp está desconectada.
-   `connecting`: A API está tentando estabelecer a conexão (QR Code pode estar disponível).
-   `connected`: A API está conectada e pronta para enviar mensagens.

### 3.4. Enviar Mensagem (`POST /api/send-message`)

Esta rota permite enviar uma mensagem de texto para um número de WhatsApp específico.

-   **URL:** `<URL_BASE_DA_API>/api/send-message`
-   **Método:** `POST`
-   **Headers:**
    -   `Authorization: Bearer <SUA_API_KEY>`
    -   `Content-Type: application/json`
-   **Body (JSON):**
    ```json
    {
      "number": "<NUMERO_DO_DESTINATARIO>",
      "message": "<TEXTO_DA_MENSAGEM>"
    }
    ```
    -   `<NUMERO_DO_DESTINATARIO>`: Número de telefone no formato internacional, sem `+` ou ` ` (ex: `558387606350`).
    -   `<TEXTO_DA_MENSAGEM>`: O conteúdo da mensagem. Suporta formatação Markdown básica (ex: `*negrito*`) e emojis.

**Exemplo de Requisição (cURL):**
```bash
curl -X POST <URL_BASE_DA_API>/api/send-message \
  -H "Authorization: Bearer sua_chave_secreta" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "558387606350",
    "message": "*Olá!* Esta é uma mensagem de *teste* com emojis! ✨🚀😊"
  }'
```

**Exemplo de Resposta (Sucesso):**
```json
{
  "success": true,
  "message": "Mensagem enviada com sucesso",
  "data": {
    "number": "558387606350",
    "message": "*Olá!* Esta é uma mensagem de *teste* com emojis! ✨🚀😊"
  }
}
```

**Exemplo de Resposta (Erro - Número ou Mensagem Ausentes):**
```json
{
  "success": false,
  "error": "Número e mensagem são obrigatórios"
}
```

**Exemplo de Resposta (Erro - Formato de Número Inválido):**
```json
{
  "success": false,
  "error": "Formato de número inválido"
}
```

**Exemplo de Resposta (Erro - WhatsApp Não Conectado):**
```json
{
  "success": false,
  "error": "WhatsApp não está conectado"
}
```

## 4. Fluxo de Integração em Outra Aplicação

Para integrar esta API em outra aplicação (por exemplo, um frontend, um backend diferente, ou um script), siga o fluxo lógico abaixo:

1.  **Configurar a API Key:** Certifique-se de que sua aplicação cliente tenha acesso à `SUA_API_KEY` configurada no servidor.

2.  **Iniciar a Conexão (Primeira Vez ou Após Desconexão):**
    -   Faça uma requisição `POST` para `/api/connect`.
    -   Monitore o terminal onde a API está rodando para ver o QR Code em ASCII.
    -   Alternativamente, faça uma requisição `GET` para `/api/qrcode` para obter o QR Code em Base64 e exiba-o na sua aplicação para o usuário escanear.
    -   O usuário deve escanear o QR Code com o aplicativo WhatsApp no celular.

3.  **Verificar o Status da Conexão:**
    -   Após iniciar a conexão e escanear o QR Code, sua aplicação deve periodicamente (ou via webhook, se implementado no futuro) verificar o status da conexão fazendo requisições `GET` para `/api/status`.
    -   Aguarde até que o `status` retorne `

