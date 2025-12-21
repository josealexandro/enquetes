# 🛡️ Boas Práticas - Evitando Problemas que Voltam

Este guia ajuda a garantir que correções importantes não sejam perdidas ou revertidas acidentalmente.

## 📋 Checklist ANTES de Fazer Pull/Merge

Sempre execute estes passos antes de fazer `git pull` ou `git merge`:

```bash
# 1. Verifique o status atual
git status

# 2. Veja quais arquivos foram modificados
git diff

# 3. Se houver mudanças não commitadas, faça commit primeiro
git add .
git commit -m "Descrição das mudanças"

# 4. Verifique em qual branch você está
git branch

# 5. Só então faça o pull
git pull origin main
```

## 🔒 Workflow Recomendado

### 1. **Sempre trabalhe em branches separadas para correções importantes**

```bash
# Criar branch para correção
git checkout -b fix/word-breaking-pollcard

# Fazer suas correções
# ... editar arquivos ...

# Commit com mensagem descritiva
git commit -m "fix: corrigir quebra de palavras no PollCard

- Adicionado min-w-0 no container flex
- Adicionados estilos inline para word-wrap
- Melhorado break-words com classes Tailwind"

# Push da branch
git push origin fix/word-breaking-pollcard

# Depois fazer merge na main (via PR ou diretamente)
```

### 2. **Commits descritivos e atômicos**

✅ **BOM:**
```
fix: corrigir quebra de palavras no PollCard
fix: adicionar expansão de foto de perfil
feat: implementar componente ExpandableImage
```

❌ **RUIM:**
```
fix
mudanças
update
```

### 3. **Documente correções importantes**

Crie um arquivo `CHANGELOG.md` ou documente no README:

```markdown
## [Correções Importantes]

### 2024-01-XX - Quebra de Palavras no PollCard
- **Arquivo:** `src/app/components/PollCard.tsx`
- **Problema:** Textos longos quebravam o layout
- **Solução:** Adicionado `min-w-0` no container flex e estilos inline
- **Linhas afetadas:** ~402, ~415-428
```

## 🚨 Proteções Automáticas

### 1. **Git Hooks (Pre-commit)**

Crie um arquivo `.git/hooks/pre-commit` (ou use husky):

```bash
#!/bin/sh
# Verificar se arquivos críticos foram modificados
git diff --cached --name-only | grep -E "(PollCard|ExpandableImage)" && {
  echo "⚠️  Arquivos críticos modificados. Verifique se as correções estão corretas!"
  echo "Arquivos:"
  git diff --cached --name-only | grep -E "(PollCard|ExpandableImage)"
}
```

### 2. **Script de Verificação**

Crie `scripts/verify-fixes.sh`:

```bash
#!/bin/bash
# Verificar se correções importantes ainda estão presentes

echo "🔍 Verificando correções importantes..."

# Verificar quebra de palavras no PollCard
if grep -q "min-w-0" src/app/components/PollCard.tsx; then
  echo "✅ min-w-0 encontrado no PollCard"
else
  echo "❌ ERRO: min-w-0 não encontrado no PollCard!"
  exit 1
fi

# Verificar ExpandableImage
if grep -q "onExpansionChange" src/app/components/ExpandableImage.tsx; then
  echo "✅ onExpansionChange encontrado no ExpandableImage"
else
  echo "❌ ERRO: onExpansionChange não encontrado!"
  exit 1
fi

echo "✅ Todas as verificações passaram!"
```

## 📝 Documentação de Correções Críticas

### Correção: Quebra de Palavras no PollCard

**Arquivo:** `src/app/components/PollCard.tsx`

**Linha ~402:**
```tsx
<div className="flex items-center flex-grow max-w-[calc(100%-48px)] min-w-0">
```
⚠️ **IMPORTANTE:** O `min-w-0` é essencial para permitir quebra de palavras em flex containers!

**Linha ~415-428:**
```tsx
<span 
  className={`break-words overflow-wrap-anywhere word-break-break-word max-w-full overflow-hidden
  ...
  `}
  style={{ 
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    maxWidth: '100%'
  }}
>
```
⚠️ **IMPORTANTE:** Os estilos inline garantem quebra mesmo se classes Tailwind não funcionarem!

### Correção: Expansão de Foto de Perfil

**Arquivo:** `src/app/components/ExpandableImage.tsx`

**Linha ~27-30:**
```tsx
useEffect(() => {
  onExpansionChange?.(isExpanded);
}, [isExpanded, onExpansionChange]);
```
⚠️ **IMPORTANTE:** O callback deve ser chamado via useEffect, não dentro do setState!

## 🔄 Antes de Fazer Pull/Merge

1. ✅ **Commit suas mudanças locais primeiro**
2. ✅ **Verifique `git status` - não deve ter arquivos não commitados**
3. ✅ **Verifique `git branch` - confirme que está na branch correta**
4. ✅ **Execute o script de verificação** (se criado)
5. ✅ **Faça backup** se necessário: `git branch backup-antes-do-pull`

## 🛠️ Se Algo For Revertido

### Recuperar mudanças perdidas:

```bash
# Ver histórico de commits
git log --oneline

# Ver mudanças em um commit específico
git show <commit-hash>

# Recuperar arquivo de um commit anterior
git checkout <commit-hash> -- src/app/components/PollCard.tsx

# Ver diferenças entre branches
git diff main..sua-branch
```

## 📌 Checklist de Proteção

- [ ] Correções importantes estão documentadas
- [ ] Commits têm mensagens descritivas
- [ ] Trabalho em branches separadas
- [ ] Verifico `git status` antes de pull/merge
- [ ] Faço commit antes de pull/merge
- [ ] Testo após pull/merge
- [ ] Mantenho um CHANGELOG atualizado

## 🎯 Regra de Ouro

> **"Se é importante, documente. Se é crítico, teste. Se é essencial, proteja."**

Sempre que fizer uma correção importante:
1. Documente no código (comentários)
2. Documente neste arquivo
3. Faça commit com mensagem clara
4. Teste antes e depois do commit
5. Considere criar um teste automatizado

