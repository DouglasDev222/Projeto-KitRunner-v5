# Investigação e Correção de Vulnerabilidade na Precificação por Zona de CEP

## 📋 Resumo do Problema
**Localização**: Página `/events/{id}/address` (Tela de confirmação de endereço)
**Criticidade**: Alta - Vulnerabilidade permite pedidos sem valor de entrega correto
**Status**: 🔴 Aguardando correção

### Vulnerabilidade Identificada
O sistema permite que usuários avancem sem que a API de precificação por zona (`cep_zone`) seja consultada corretamente, resultando em:
- Pedidos sem valor de entrega definido
- Bypass da verificação de cobertura de entrega  
- Fallback incorreto para `cep_distance` mesmo quando evento é `cep_zone`

### Comportamentos Suspeitos
1. **Reload da página (F5)**: Precificação por zona não é chamada ou chamada tarde demais
2. **Race condition**: Delay na execução da chamada da API após reload
3. **Confirmação prematura**: Botão "Confirmar Endereço" permite avanço sem cálculo válido

## 🎯 Objetivos da Correção
- [ ] Garantir que API de precificação por zona seja sempre chamada com sucesso
- [ ] Impedir avanço sem precificação válida
- [ ] Bloquear fallback incorreto para `cep_distance` 
- [ ] Adicionar validações de segurança no backend
- [ ] Melhorar experiência do usuário com indicadores de carregamento

## 🔧 Plano de Implementação

### Fase 1: Investigação e Diagnóstico
- [ ] **1.1** Analisar código atual da tela `/events/{id}/address`
- [ ] **1.2** Identificar todos os pontos onde a precificação é chamada
- [ ] **1.3** Mapear fluxo atual de estados e condições
- [ ] **1.4** Identificar race conditions e pontos de falha
- [ ] **1.5** Documentar comportamento atual vs esperado

### Fase 2: Correções no Frontend
- [ ] **2.1** Implementar estado obrigatório de carregamento da precificação
- [ ] **2.2** Adicionar verificação explícita no botão "Confirmar Endereço"
- [ ] **2.3** Forçar nova consulta da API em caso de reload
- [ ] **2.4** Bloquear submissão enquanto precificação não for válida
- [ ] **2.5** Adicionar indicadores visuais de carregamento
- [ ] **2.6** Implementar fallback seguro com avisos claros

### Fase 3: Validações de Segurança no Backend
- [ ] **3.1** Validar tipo de entrega no momento da criação do pedido
- [ ] **3.2** Bloquear criação se evento exige `cep_zone` e não há zona válida
- [ ] **3.3** Adicionar logs detalhados para debug
- [ ] **3.4** Implementar validação de integridade dos dados de precificação

### Fase 4: Testes e Validação
- [ ] **4.1** Testar reload da página múltiplas vezes
- [ ] **4.2** Testar diferentes cenários de rede (lenta/rápida)
- [ ] **4.3** Validar comportamento com CEPs sem cobertura
- [ ] **4.4** Testar tentativas de bypass manual
- [ ] **4.5** Verificar logs do backend para validações

### Fase 5: Documentação e Finalização  
- [ ] **5.1** Atualizar documentação técnica
- [ ] **5.2** Registrar correções no `replit.md`
- [ ] **5.3** Criar relatório de segurança
- [ ] **5.4** Marcar vulnerabilidade como corrigida

## 💻 Detalhes Técnicos da Implementação

### 2.1 Estado Obrigatório de Carregamento
```typescript
const [zonePricingStatus, setZonePricingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
```

### 2.2 Verificação no Botão de Confirmação
```typescript
const handleConfirmAddress = async () => {
  if (event.tipo_entrega === 'cep_zone') {
    setZonePricingStatus('loading');
    try {
      const pricingResult = await fetchZonePricing();
      if (pricingResult.valid) {
        setZonePricingStatus('success');
        // Permitir avanço
      } else {
        setZonePricingStatus('error');
        // Bloquear e mostrar erro
      }
    } catch (error) {
      setZonePricingStatus('error');
      // Tratar erro
    }
  }
};
```

### 3.1 Validação Backend
```typescript
// No endpoint de criação de pedido
if (event.tipo_entrega === 'cep_zone') {
  const zoneValidation = await validateCepZone(address.cep, event.id);
  if (!zoneValidation.valid) {
    throw new Error('CEP zone validation failed');
  }
}
```

## 🛡️ Medidas de Segurança
1. **Frontend**: Desabilitar botão enquanto carregando
2. **Frontend**: Evitar fallback automático sem confirmação
3. **Frontend**: Spinner durante consultas da API
4. **Backend**: Validação obrigatória de zona para eventos `cep_zone`
5. **Backend**: Logs detalhados para auditoria
6. **Backend**: Bloqueio de criação de pedido sem precificação válida

## 📊 Critérios de Sucesso
- ✅ Impossível avançar sem precificação válida
- ✅ API sempre consultada em eventos `cep_zone`
- ✅ Fallback controlado e transparente
- ✅ Backend bloqueia pedidos inválidos
- ✅ Experiência do usuário melhorada
- ✅ Zero vulnerabilidades na precificação

## 🚨 Notas Importantes
- **Criticidade Alta**: Esta vulnerabilidade pode causar perdas financeiras
- **Teste Obrigatório**: Cada mudança deve ser testada em múltiplos cenários
- **Rollback**: Manter plano de rollback para cada fase
- **Monitoramento**: Implementar logs para monitoramento contínuo

---
*Documento criado em: 07/08/2025*
*Última atualização: [A ser preenchida durante implementação]*