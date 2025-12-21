#!/bin/bash
# Script de Verificação de Correções Importantes
# Execute: bash scripts/verify-fixes.sh

echo "🔍 Verificando correções importantes..."

ERRORS=0

# Verificar quebra de palavras no PollCard
echo ""
echo "📄 Verificando PollCard.tsx..."
if grep -q "min-w-0" src/app/components/PollCard.tsx; then
  echo "  ✅ min-w-0 encontrado no container flex"
else
  echo "  ❌ ERRO: min-w-0 não encontrado no PollCard!"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "overflow-wrap-anywhere\|word-break-break-word" src/app/components/PollCard.tsx; then
  echo "  ✅ Classes de quebra de palavras encontradas"
else
  echo "  ⚠️  Classes de quebra podem estar faltando"
fi

if grep -q "wordWrap.*break-word\|overflowWrap.*break-word" src/app/components/PollCard.tsx; then
  echo "  ✅ Estilos inline de quebra encontrados"
else
  echo "  ❌ ERRO: Estilos inline de quebra não encontrados!"
  ERRORS=$((ERRORS + 1))
fi

# Verificar ExpandableImage
echo ""
echo "📄 Verificando ExpandableImage.tsx..."
if grep -q "onExpansionChange" src/app/components/ExpandableImage.tsx; then
  echo "  ✅ onExpansionChange encontrado"
else
  echo "  ❌ ERRO: onExpansionChange não encontrado!"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "useEffect.*onExpansionChange" src/app/components/ExpandableImage.tsx; then
  echo "  ✅ Callback usando useEffect (correto)"
else
  echo "  ⚠️  Verifique se o callback está usando useEffect"
fi

# Verificar se não há chamadas diretas de setState com callback
if grep -q "setIsExpanded.*onExpansionChange" src/app/components/ExpandableImage.tsx; then
  echo "  ❌ ERRO: Callback dentro de setState encontrado (deve usar useEffect)!"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ Nenhum callback dentro de setState"
fi

# Resultado final
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ Todas as verificações passaram!"
  exit 0
else
  echo "❌ $ERRORS erro(s) encontrado(s). Revise as correções acima."
  exit 1
fi

