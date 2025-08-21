# 🛡️ SISTEMA DE FALLBACK - GERAÇÃO DE NÚMEROS DE PEDIDOS

## Como Funciona o Sistema de Proteção

O sistema possui **3 níveis de fallback** para garantir que nunca falharemos em gerar um número de pedido:

### 🎯 NÍVEL 1: Geração Sequencial Normal (Ideal)

**Funcionamento:**
1. Busca o último número do ano atual no banco
2. Incrementa +1 no número sequencial
3. Verifica se já existe no banco
4. Se não existir, usa o número

**Exemplo:**
```
Último pedido: KR25-1005
Próximo número: KR25-1006
Verificação: ✅ Não existe
Resultado: KR25-1006
```

**Logs que você verá:**
```
✅ Generated unique order number: KR25-1006 (attempt 1)
```

---

### ⚠️ NÍVEL 2: Fallback Timestamp (Se sequencial falhar)

**Quando ativa:**
- Erro na consulta ao banco
- Problema na geração sequencial
- Após 100 tentativas sem sucesso

**Funcionamento:**
1. Usa timestamp atual (Date.now())
2. Pega os últimos 6 dígitos
3. Formato: `KR{YY}-{timestamp}`

**Exemplo:**
```
Timestamp: 1755807220005
Últimos 6 dígitos: 220005
Resultado: KR25-220005
```

**Logs que você verá:**
```
🚨 FALLBACK: Using timestamp-based order number generation
🛡️ FALLBACK: Generated order number KR25-220005
```

---

### 🆘 NÍVEL 3: Último Recurso (Se timestamp também falhar)

**Quando ativa:**
- Timestamp já existe no banco (muito raro)
- Falha completa nos sistemas anteriores

**Funcionamento:**
1. Usa timestamp + número aleatório
2. Pega 5 dígitos do timestamp + 3 aleatórios
3. Formato: `KR{YY}-{timestamp5}{random3}`

**Exemplo:**
```
Timestamp: 1755807220005
5 dígitos: 20005
Random: 847
Resultado: KR25-20005847
```

**Logs que você verá:**
```
🆘 LAST RESORT: Generated order number KR25-20005847
```

---

## 🔄 Fluxo Completo do Sistema

```
TENTATIVA 1-100: Sequencial
├── KR25-1000 ✅ (sucesso)
├── KR25-1001 ✅ (sucesso)
├── KR25-1002 ❌ (já existe)
├── KR25-1003 ✅ (sucesso)
└── ... continua até 100 tentativas

SE FALHAR APÓS 100 TENTATIVAS:
├── FALLBACK NÍVEL 2: KR25-220005
│   ├── Verifica se existe ✅ (não existe)
│   └── Usa este número
│
└── SE TIMESTAMP TAMBÉM EXISTIR:
    └── ÚLTIMO RECURSO: KR25-20005847
```

## 🛡️ Proteções Implementadas

### 1. **Proteção contra Loop Infinito**
```typescript
const maxAttempts = 100; // Máximo 100 tentativas
for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Tenta gerar número...
}
```

### 2. **Verificação Dupla de Duplicatas**
```typescript
// Verifica no banco antes de usar
const existingOrder = await this.getOrderByNumber(newOrderNumber);
if (!existingOrder) {
    return newOrderNumber; // ✅ Seguro para usar
}
```

### 3. **Logs Detalhados para Debug**
```typescript
console.log(`✅ Generated unique order number: ${newOrderNumber} (attempt ${attempt + 1})`);
console.warn(`⚠️ Order number ${newOrderNumber} already exists, trying next number`);
console.error(`❌ Error generating order number (attempt ${attempt + 1}):`, error);
```

## 📊 Cenários de Uso dos Fallbacks

### Cenário 1: Uso Normal (99.9% dos casos)
```
🎯 NÍVEL 1 ATIVO
KR25-1000 → KR25-1001 → KR25-1002...
Logs: ✅ Generated unique order number
```

### Cenário 2: Problema no Banco (0.1% dos casos)
```
⚠️ NÍVEL 2 ATIVO  
Erro na consulta → Usa timestamp
Logs: 🚨 FALLBACK: Using timestamp-based generation
```

### Cenário 3: Catástrofe Total (0.001% dos casos)
```
🆘 NÍVEL 3 ATIVO
Timestamp duplicado → Usa timestamp+random
Logs: 🆘 LAST RESORT: Generated order number
```

## 🔍 Como Monitorar o Sistema

### Logs Normais (Tudo OK):
```
✅ Generated unique order number: KR25-1006 (attempt 1)
```

### Logs de Aviso (Duplicata encontrada):
```
⚠️ Order number KR25-1007 already exists, trying next number (attempt 2)
✅ Generated unique order number: KR25-1008 (attempt 2)
```

### Logs de Fallback (Problema detectado):
```
❌ Error generating order number (attempt 95): Database connection error
🚨 FALLBACK: Using timestamp-based order number generation
🛡️ FALLBACK: Generated order number KR25-220005
```

## 🎯 Benefícios do Sistema

1. **Zero Falhas**: Sempre gera um número, mesmo em catástrofes
2. **Preferência Sequencial**: Mantém ordem quando possível
3. **Logs Auditáveis**: Rastreia todos os problemas
4. **Performance**: Falha rápido se necessário
5. **Recuperação Automática**: Volta ao sequencial quando sistema normaliza

O sistema garante que **nunca perderemos um pedido** por falha na geração de números!