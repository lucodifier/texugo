# 🦡 Texugo - Estado Atual da Versão

**Data de Atualização:** 11 de Novembro de 2026, 15:02 (Horário de Brasília)  
**Repositório:** `C:\codes\CodeHolistic\TexugoIA`  
**Branch:** `master`  
**Executáveis gerados e prontos para teste:**
- 🚀 **Executável direto:** [Texugo.exe](file:///c:/codes/CodeHolistic/TexugoIA/release/win-unpacked/Texugo.exe)
- 📦 **Instalador NSIS:** [Texugo-Setup-0.1.0.exe](file:///c:/codes/CodeHolistic/TexugoIA/release/Texugo-Setup-0.1.0.exe)

---

## 📌 1. Visão Geral do Projeto

O **Texugo** é um desktop manager local em Electron + React + Tailwind + xterm + ConPTY (via `node-pty`), projetado para gerenciar múltiplos terminais de agentes de inteligência artificial (**Claude Code**, **Freebuff**, **Codex**, etc.) e terminais de sistema (**Windows Terminal com Bash**, **Git Bash**, **PowerShell**, etc.) rodando lado a lado em projetos e pastas distintas no Windows.

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
| **9** | **Espaçamento e descompasso de cursor ao digitar no prompt (`>e  ntao`)** | Instalado e ativado o `@xterm/addon-unicode11` (substituindo o Unicode 6 legado pelo Unicode 11); habilitado `windowsPty` com heurísticas nativas do ConPTY para Windows; empacotado o `OpenConsole.exe` moderno v1.23 do Windows Terminal com `useConptyDll: true` para eliminar drift de coordenadas em caracteres Unicode como `❯`. | `package.json`, `src/features/terminal/terminal-registry.ts`, `electron/terminal/pty-manager.ts`, `scripts/patch-node-pty.mjs` |
| **10** | **Suporte a Freebuff, Codex, Windows Terminal e Gerenciamento nas Configurações (Problema 2)** | Adicionados **Freebuff** (`Fb`), **Codex** (`Cx`), **Windows Terminal (Bash)** (`WT`) e **Git Bash** (`Ba`); criada aba de gerenciamento em Configurações com toggle On/Off, edição e cadastro de terminais. | `shared/types.ts`, `shared/defaults.ts`, `electron/main/database.ts`, `electron/terminal/command-resolve.ts`, `src/features/settings/SettingsModal.tsx`, `src/features/agents/AgentModal.tsx`, `src/components/Header.tsx`, `src/components/Sidebar.tsx`, `src/features/sessions/NewSessionModal.tsx` |
| **11** | **Terminal travado em "[processo encerrado com código 0]" ao dar Ctrl+C (Problema 3)** | Auto-handoff imediato para o terminal padrão ao encerrar agente com Ctrl+C; despertar por tecla `Enter`; botões na barra superior e banner flutuante; auto-fechamento ao digitar `exit` no shell padrão. | `electron/main/ipc.ts`, `src/services/ipc.ts`, `src/stores/useAppStore.ts`, `src/features/terminal/terminal-registry.ts`, `src/features/terminal/TerminalPane.tsx` |
| **12** | **Terminal ocupando só metade da tela com espaço vazio na direita (Problema 4)** | Quando há apenas 1 terminal aberto, o layout agora **força 100% da largura e altura** (`grid-cols-1 grid-rows-1`), ocupando a janela inteira sem deixar nenhuma coluna ou espaço preto vazio. A tela se divide apenas quando houver 2 ou mais terminais abertos. | `src/components/LayoutGrid.tsx` |
| **13** | **Nome do projeto cortado em "O..." e Sidebar sem redimensionamento** | 1. **Sidebar Redimensionável:** Adicionada alça na borda direita da sidebar permitindo arrastar com o mouse para aumentar ou diminuir a largura (salva automaticamente no `localStorage`).<br>2. **Nome do Projeto Completo:** Removida a reserva estática de espaço dos botões invisíveis (agora aparecem como overlay apenas no hover), permitindo que o nome do projeto use 100% da largura da barra lateral sem truncar em "O...". | `src/components/Sidebar.tsx` |

---

## 🛠️ 3. Comandos Úteis

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
