# 🦡 Texugo - Estado Atual da Versão e Plano de Retomada

**Data de Atualização:** 10 de Novembro de 2026, 23:58 (Horário de Brasília)  
**Repositório:** `C:\codes\CodeHolistic\TexugoIA`  
**Branch:** `master` (último commit funcional: `0195182` - *fix: remove terminal count badge from project list in sidebar*)  
**Executáveis gerados e prontos para teste:**
- 🚀 **Executável direto:** `release\win-unpacked\Texugo.exe`
- 📦 **Instalador NSIS:** `release\Texugo-Setup-0.1.0.exe`

---

## 📌 1. Visão Geral do Projeto

O **Texugo** é um desktop manager local em Electron + React + Tailwind + xterm + ConPTY (via `node-pty`), projetado para gerenciar múltiplos terminais de agentes de inteligência artificial (como **Claude Code** e **Freebuff**) rodando lado a lado em projetos/pastas distintas no Windows.

---

## ✅ 2. Problemas Resolvidos até esta Versão

| # | Problema | Solução Implementada | Arquivos Modificados |
|---|---|---|---|
| **1** | **Texto picotado/cortado no xterm** | Removido padding interno da classe `.xterm` no CSS; aplicado padding no container React; `lineHeight: 1.0`; fallback com *Cascadia Code*; `allowTransparency: false` para subpixel antialiasing ClearType nativo. | `src/index.css`, `src/features/terminal/TerminalPane.tsx` |
| **2** | **Wispr Flow e Ctrl+V colando texto duplicado** | Removidos ouvintes redundantes `input` e `composition` do textarea auxiliar; implementada proteção contra duplicação de colagem com normalização e janela de 500ms; proteção adicional no fluxo de entrada do PTY. | `src/features/terminal/terminal-registry.ts` |
| **3** | **Grade travada em 4 janelas fixas** | Adicionado modo `AUTO` inteligente que ajusta dinamicamente a grade para 1, 2, 3, 4, 6 janelas sem slots vazios tracejados; adicionado preset de 3 colunas lado a lado (`3`). | `shared/layout.ts`, `shared/types.ts`, `src/components/LayoutGrid.tsx`, `src/components/Header.tsx` |
| **4** | **Sidebar sem informações de branch e modelo** | Criada inspeção de branch ativa via `git rev-parse` (`ipc.inspectGit`); adicionado extrator de modelo em tempo real nos logs do terminal; exibidos abaixo do nome do projeto na barra lateral. | `src/components/Sidebar.tsx`, `src/stores/useAppStore.ts`, `electron/main/ipc.ts` |
| **5** | **Texto redundante "executando" em verde no topo da janela** | Removido o badge "executando" que poluía todos os terminais ativos; mantidos apenas status informativos reais (`iniciando`, `encerrado`, `erro`). | `src/features/terminal/TerminalPane.tsx` |
| **6** | **Botão inútil de restaurar/maximizar grade na janela** | Removido o botão de maximizar/restaurar do toolbar do terminal pane, mantendo o controle centralizado e o layout sempre limpo e previsível. | `src/features/terminal/TerminalPane.tsx` |
| **7** | **Clicar no X deixava "processo encerrado com código 1" e travava a janela** | Corrigido para chamar diretamente `deleteSession()`, fechando o terminal de forma imediata (0ms de latência), descartando a instância do xterm/DOM, encerrando os processos via `taskkill /T /F` no ConPTY e reorganizando a grade automaticamente. | `src/features/terminal/TerminalPane.tsx`, `src/stores/useAppStore.ts`, `electron/main/ipc.ts`, `electron/terminal/pty-manager.ts` |
| **8** | **Número 1 com bolinha verde ao lado do projeto na sidebar** | Removido completamente o contador de terminais ao lado do nome do projeto, deixando a lista visualmente limpa e moderna. | `src/components/Sidebar.tsx` |

---

## 🎯 3. Próximo Ponto para Iniciar Amanhã: **Suporte ao Freebuff**

### O que foi solicitado:
> *"Permitir tbem alem do cloude code o freebuff"*

### Diagnóstico já realizado:
1. O executável do **Freebuff** já está instalado no computador do usuário:
   - Caminho npm global: `C:\Users\codeholistic\AppData\Roaming\npm\freebuff.cmd`
   - Caminho binário nativo: `C:\Users\codeholistic\.config\manicode\freebuff.exe`
   - Versão detectada: `0.2.36`
2. O arquivo `electron/terminal/command-resolve.ts` já teve o diretório `.config\manicode` adicionado às pastas prioritárias de busca de executáveis no PATH.

### O que precisa ser finalizado amanhã:
1. **Adicionar o Freebuff na lista de agentes padrão:**
   - No arquivo `shared/defaults.ts`:
     ```ts
     agent('freebuff', 'Freebuff', 'freebuff', 'Fb', '#00e599', 'none')
     ```
   - Posicioná-lo logo abaixo do Claude Code para que apareça como destaque prioritário no topo.
2. **Adicionar atalhos de disparo rápido (1 clique) para o Freebuff:**
   - **No Header (topo):** Ao lado do projeto ativo, exibir botões rápidos para disparar `[ Claude Code ]` e `[ Freebuff ]`.
   - **Na Sidebar (ao passar o mouse sobre o projeto):** Exibir os botões de inicialização rápida `Cl` (Claude) e `Fb` (Freebuff), além do `+` para escolher outros agentes.
3. **Detecção de Modelo do Freebuff:**
   - Adicionar `Freebuff` à regex de detecção em `TerminalPane.tsx` e `useAppStore.ts` para que o badge da barra lateral mostre `Freebuff` quando ele estiver em execução.
4. **Validação & Build:**
   - Rodar testes unitários: `npm test`
   - Gerar nova build: `npm run build && npx electron-builder --win`
   - Testar a abertura do terminal Freebuff e Claude Code lado a lado.

---

## 🛠️ 4. Comandos Úteis para o Desenvolvimento

- **Rodar em modo desenvolvimento:**
  ```powershell
  npm run dev
  ```
- **Rodar a suíte de testes:**
  ```powershell
  npm test
  ```
- **Gerar a build do Electron e executáveis:**
  ```powershell
  npm run build
  npx electron-builder --win
  ```
- **Localização dos binários de release:**
  ```
  release\win-unpacked\Texugo.exe
  release\Texugo-Setup-0.1.0.exe
  ```
