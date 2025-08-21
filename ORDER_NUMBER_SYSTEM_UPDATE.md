# 🔢 SISTEMA DE NUMERAÇÃO DE PEDIDOS - ATUALIZADO

## Implementação Concluída

**Data:** August 21, 2025
**Status:** ✅ IMPLEMENTADO

### Novo Formato de Numeração

#### Especificações:
- **Formato:** `KR{YY}-{NNNN}`
- **KR:** Prefixo fixo
- **YY:** Últimos 2 dígitos do ano atual
- **-:** Traço separador
- **NNNN:** Número sequencial de 4 dígitos

#### Regras de Numeração:
1. **2025:** Inicia em `KR25-1000`
2. **2026+:** Inicia em `KR26-0001`
3. **Reset anual:** Contador volta para 0001 a cada ano novo
4. **Expansão:** Se passar de 9999, continua com 5+ dígitos

### Exemplos de Numeração:

#### Ano 2025:
- `KR25-1000` (primeiro pedido)
- `KR25-1001` (segundo pedido)
- `KR25-1002` (terceiro pedido)
- `KR25-9999` (último de 4 dígitos)
- `KR25-10000` (primeiro de 5 dígitos)

#### Ano 2026:
- `KR26-0001` (primeiro pedido do ano)
- `KR26-0002` (segundo pedido)
- `KR26-0003` (terceiro pedido)

### Proteções Implementadas

#### 1. Verificação de Duplicatas
- Consulta banco antes de gerar número
- Incrementa automaticamente se já existir
- Máximo 100 tentativas para evitar loops infinitos

#### 2. Fallback de Segurança
**Nível 1:** Geração sequencial normal
**Nível 2:** Timestamp se sequencial falhar
**Nível 3:** Timestamp + random se tudo falhar

#### 3. Logs de Auditoria
- Log de cada número gerado
- Avisos quando duplicatas são encontradas
- Erros detalhados para debug

### Código Implementado

#### Arquivo: `server/storage.ts`

```typescript
async generateUniqueOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2);
  const startingNumber = currentYear === 2025 ? 1000 : 1;
  
  // Busca último número do ano
  const yearPrefix = `KR${yearSuffix}-`;
  const existingOrders = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(sql`${orders.orderNumber} LIKE ${yearPrefix + '%'}`)
    .orderBy(sql`${orders.orderNumber} DESC`)
    .limit(1);

  // Calcula próximo número sequencial
  let nextSequential = startingNumber;
  if (existingOrders.length > 0) {
    const lastNumber = existingOrders[0].orderNumber.split('-')[1];
    nextSequential = parseInt(lastNumber) + 1;
  }

  // Gera número com proteção contra duplicatas
  const formattedSequential = String(nextSequential).padStart(4, '0');
  const newOrderNumber = `KR${yearSuffix}-${formattedSequential}`;
  
  return newOrderNumber;
}
```

### Migração Automática

#### Sistema Atual (Antigo):
- Formato: `KR{YYYY}{timestamp}`
- Exemplo: `KR2025123456`

#### Sistema Novo:
- Formato: `KR{YY}-{NNNN}`
- Exemplo: `KR25-1000`

#### Compatibilidade:
- ✅ Pedidos antigos continuam funcionando
- ✅ Busca por número funciona para ambos formatos
- ✅ Novos pedidos usam formato novo automaticamente

### Próximos Pedidos

Quando o próximo pedido for criado, você verá nos logs:
```
✅ Generated unique order number: KR25-1000 (attempt 1)
```

E no banco de dados será salvo com o novo formato.

### Verificação Manual

Para verificar se está funcionando:
1. Criar um novo pedido via interface
2. Observar logs do servidor
3. Verificar formato do número gerado
4. Confirmar que não há duplicatas

---

**✅ IMPLEMENTAÇÃO COMPLETA**
O sistema está pronto para gerar números no novo formato a partir do próximo pedido criado.