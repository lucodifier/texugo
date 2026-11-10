# Projeto: Agent Desktop — Gerenciador de Agentes de IA

## 1. Objetivo

Desenvolva uma aplicação desktop para Windows chamada **Agent Desktop**, destinada ao gerenciamento visual de múltiplos agentes de programação executados localmente por meio de CLI.

A aplicação deve oferecer uma experiência semelhante ao Alethe, permitindo abrir vários agentes simultaneamente, visualizar seus terminais em uma grade, organizar sessões por projeto, persistir conversas e retomar trabalhos posteriormente.

**A aplicação NÃO deve implementar agentes próprios, consumir APIs de modelos ou exigir chaves de API.**

Ela deve funcionar como um gerenciador de processos e terminais, utilizando ferramentas que o usuário já possui instaladas e autenticadas no Windows.

Exemplos:
- Claude Code (`claude`)
- OpenAI Codex CLI (`codex`)
- OpenCode (`opencode`)
- Cursor Agent CLI (`cursor-agent`)
- Gemini CLI (`gemini`)
- PowerShell
- CMD
- Git Bash
- Qualquer outro comando configurável pelo usuário.

A autenticação deve ser herdada do ambiente local. Por exemplo, ao abrir um terminal e executar `claude`, a ferramenta deve utilizar a autenticação já existente do Claude Code.

Não solicitar API Keys, não implementar autenticação própria e não intermediar chamadas aos provedores de IA.

---

## 2. Stack tecnológica

Utilize preferencialmente:

- Electron: aplicação desktop.
- React: interface.
- TypeScript: tipagem.
- Vite: build e desenvolvimento.
- Node.js: gerenciamento dos processos.
- node-pty: criação de terminais reais.
- ConPTY: suporte nativo ao terminal do Windows.
- xterm.js: renderização dos terminais.
- xterm-addon-fit: redimensionamento dos terminais.
- xterm-addon-web-links: identificação de links.
- SQLite: persistência local.
- Zustand: gerenciamento de estado.
- Tailwind CSS: estilização.

A arquitetura deve separar claramente:
1. Interface gráfica.
2. Gerenciamento de sessões.
3. Gerenciamento de processos.
4. Motor de terminal.
5. Persistência.
6. Comunicação entre processos Electron.

Não utilizar um componente React simulando um terminal por meio de texto. Os terminais precisam ser reais, interativos e conectados aos processos do sistema operacional.

---

## 3. Interface e experiência do usuário

Desenvolva uma interface moderna, profissional e escura, inspirada no Alethe.

A interface deve priorizar produtividade e permitir acompanhar vários agentes simultaneamente.

### Layout principal

**Sidebar esquerda:**
- Lista de projetos.
- Criar projeto.
- Editar e remover projeto.
- Expandir e recolher projetos.
- Mostrar quantidade de sessões.
- Indicador de sessões ativas.

**Área principal:**
- Abas de projetos.
- Grade de terminais.
- Painéis redimensionáveis.
- Alternância entre visualização individual e múltipla.
- Barra de ferramentas.
- Botão para adicionar terminal.
- Botão para maximizar um terminal.

**Barra superior de cada terminal:**
- Nome da sessão.
- Ferramenta utilizada.
- Diretório de trabalho.
- Indicador de execução.
- Menu de ações.
- Minimizar, maximizar e fechar.

### Layouts

Permitir organizar os terminais em:

- 1 painel.
- 2 painéis horizontais.
- 2 painéis verticais.
- 4 painéis.
- 6 painéis.
- 8 painéis.

Também permitir redimensionar livremente os painéis por meio de divisores.

A aplicação deve preservar o layout individual de cada projeto.

---

## 4. Gerenciamento de projetos

Cada projeto deve representar um diretório local do Windows.

Exemplo:

- Hub360
- Paralogy
- Records
- Agroplay
- Infraestrutura

Cada projeto deve possuir:

- Nome.
- Caminho absoluto.
- Cor ou identificação visual.
- Lista de sessões.
- Layout salvo.
- Histórico de sessões.
- Configurações próprias.

Ao abrir um projeto, a aplicação deve apresentar suas sessões anteriores.

Permitir adicionar múltiplos terminais dentro do mesmo projeto, inclusive com diretórios de trabalho diferentes.

---

## 5. Gerenciamento dos agentes

Criar um sistema configurável de agentes.

Cada agente deve possuir:

- Nome.
- Comando de inicialização.
- Argumentos opcionais.
- Executável.
- Diretório de trabalho.
- Variáveis de ambiente opcionais.
- Ícone.
- Cor de identificação.

Criar configurações iniciais:

| Agente | Comando |
|---|---|
| Claude Code | claude |
| Codex | codex |
| OpenCode | opencode |
| Cursor | cursor-agent |
| Gemini CLI | gemini |
| PowerShell | powershell |
| CMD | cmd |

Os comandos devem ser editáveis.

O usuário deve conseguir criar novos perfis sem modificar o código.

Ao clicar em um agente, criar um novo processo de terminal utilizando o comando configurado.

Não simular execuções. Executar os processos reais instalados no computador.

---

## 6. Motor de terminal — prioridade máxima

Esta é a parte mais importante do projeto.

O sistema precisa resolver os problemas encontrados em aplicações como Alethe e Agentrium.

### Requisitos obrigatórios

1. Utilizar node-pty com suporte ao ConPTY do Windows.
2. Utilizar xterm.js como emulador de terminal.
3. Cada terminal deve possuir sua própria instância independente.
4. Cada terminal deve possuir seu próprio processo PTY.
5. Cada terminal deve possuir seu próprio buffer de scrollback.
6. A saída do processo não pode depender da renderização da interface.
7. O redimensionamento de um painel não pode interromper a sessão.
8. A troca de abas não pode destruir o terminal.
9. O terminal deve preservar o histórico mesmo quando estiver em segundo plano.
10. A aplicação deve suportar saídas extensas e contínuas.

### Problemas que precisam ser evitados

**Problema 1 — Perda de scroll**

Quando o Claude Code apresentar uma resposta extensa, o usuário precisa conseguir rolar até o início da saída e consultar toda a conversa.

Não limitar o histórico a uma pequena quantidade de linhas.

Não perder o histórico ao trocar de painel, projeto ou aba.

**Problema 2 — Texto desaparecendo**

Quando o agente produzir uma saída longa, toda a saída precisa ser processada corretamente.

Evitar problemas de renderização, linhas desaparecendo, sobreposição de conteúdo e atualização incompleta da tela.

**Problema 3 — Caracteres presos**

O campo de entrada não pode manter caracteres visualmente presos, duplicar letras ou perder caracteres digitados.

A entrada do teclado precisa ser encaminhada corretamente ao processo PTY.

**Problema 4 — Rolagem automática**

Implementar comportamento inteligente:

- Se o usuário estiver no final do terminal, acompanhar automaticamente a saída.
- Se o usuário subir para consultar o histórico, não forçar a rolagem para baixo.
- Exibir uma opção para voltar ao final.
- Não perder a posição de rolagem ao atualizar a interface.

**Problema 5 — Redimensionamento**

Ao redimensionar painéis, ajustar o tamanho do terminal e enviar as dimensões corretas ao PTY.

Não reiniciar o processo quando o painel mudar de tamanho.

### Renderização

Avaliar o uso de:
- xterm.js.
- WebGL renderer, quando compatível.
- Canvas renderer como alternativa.
- DOM renderer como fallback.

O sistema deve detectar falhas de renderização e oferecer fallback.

Não sacrificar estabilidade em favor de desempenho visual.

---

## 7. Persistência e retomada de conversas

A aplicação precisa salvar automaticamente o estado.

Utilizar SQLite para armazenar:

- Projetos.
- Sessões.
- Identificadores de sessões.
- Comandos executados.
- Diretórios de trabalho.
- Layouts.
- Configurações.
- Histórico de saída, quando necessário.

### Retomada de sessões

O usuário precisa conseguir fechar o aplicativo e retornar posteriormente.

Ao reabrir:

1. Restaurar projetos.
2. Restaurar abas.
3. Restaurar layouts.
4. Restaurar identificação das sessões.
5. Recuperar o histórico disponível.
6. Permitir retomar conversas de agentes compatíveis.

**Importante:** não confundir restaurar o histórico visual com restaurar um processo encerrado.

Para Claude Code, utilizar os mecanismos oficiais de identificação e retomada de sessões, como `--resume` ou `--continue`, quando aplicáveis.

Para Codex e outros agentes, implementar adaptadores específicos, respeitando os mecanismos oficiais de cada CLI.

Não inventar identificadores de sessão.

Se uma sessão não puder ser retomada, informar claramente ao usuário e oferecer a abertura de um novo terminal.

O histórico visual deve ser independente do processo do agente.

---

## 8. Identificação do estado dos agentes

Implementar indicadores visuais de estado:

- Inicializando.
- Executando.
- Aguardando interação.
- Finalizado.
- Erro.
- Encerrado.

A identificação deve ser baseada em eventos confiáveis do processo e integrações opcionais com hooks oficiais dos agentes.

Não afirmar que um agente está aguardando aprovação apenas porque não produziu saída durante alguns segundos.

Permitir ao usuário configurar os indicadores.

---

## 9. Gerenciamento de sessões

Cada sessão deve permitir:

- Criar.
- Renomear.
- Encerrar.
- Reiniciar.
- Maximizar.
- Minimizar.
- Mover entre projetos.
- Duplicar configuração.
- Abrir diretório no Explorer.
- Copiar histórico.
- Limpar visualização sem apagar a sessão.
- Retomar conversa quando suportado.

Encerrar uma sessão deve solicitar confirmação quando houver processo em execução.

Não matar processos sem autorização.

---

## 10. Git e worktrees

Implementar funcionalidades opcionais de Git:

- Identificar se o diretório pertence a um repositório.
- Exibir branch atual.
- Exibir alterações pendentes.
- Criar worktree.
- Abrir sessão em uma worktree.
- Listar worktrees existentes.
- Remover worktrees mediante confirmação.

Não criar worktrees automaticamente sem autorização do usuário.

---

## 11. Segurança

A aplicação deve ser local-first.

Requisitos:

- Não enviar dados para servidores externos.
- Não enviar conversas para serviços de terceiros.
- Não armazenar tokens de autenticação desnecessariamente.
- Utilizar contextIsolation.
- Manter nodeIntegration desabilitado no renderer.
- Utilizar IPC com contratos tipados.
- Validar caminhos e comandos.
- Evitar execução arbitrária por meio da interface.
- Não executar comandos destrutivos automaticamente.
- Não acessar credenciais dos agentes.

O usuário é responsável por autorizar a execução dos comandos.

---

## 12. Configurações

Criar uma área de configurações contendo:

- Tema escuro e claro.
- Fonte do terminal.
- Tamanho da fonte.
- Espaçamento.
- Quantidade de linhas de scrollback.
- Shell padrão.
- Diretório padrão.
- Configuração de agentes.
- Atalhos de teclado.
- Layout padrão.
- Restauração automática de sessões.
- Configurações de desempenho.

---

## 13. Testes automatizados

Esta etapa é obrigatória.

Criar testes unitários, integração e testes E2E.

### Cenários de teste do terminal

1. Abrir 1 terminal PowerShell.
2. Abrir 4 terminais simultaneamente.
3. Abrir 8 terminais simultaneamente.
4. Executar Claude Code em múltiplos terminais.
5. Executar comandos longos.
6. Produzir 50 mil linhas de saída.
7. Rolar até o início do histórico.
8. Redimensionar os painéis continuamente.
9. Trocar entre projetos.
10. Alternar entre sessões.
11. Digitar rapidamente.
12. Testar caracteres especiais e acentuação.
13. Testar Alt+Tab.
14. Fechar e reabrir a aplicação.
15. Retomar uma sessão Claude Code.
16. Testar encerramento inesperado do aplicativo.
17. Testar sessões que continuam executando em segundo plano.

### Critérios de qualidade

- Nenhuma perda de dados por troca de painel.
- Nenhuma duplicação de caracteres.
- Nenhum bloqueio permanente de rolagem.
- Nenhuma perda de histórico por atualização visual.
- Nenhuma sessão encerrada inesperadamente por redimensionamento.
- Recuperação consistente após reinicialização.

Não considerar a funcionalidade concluída apenas porque o teste inicial funcionou.

---

## 14. Estrutura do projeto

Organizar o código por responsabilidades.

Sugestão:

```text
agent-desktop/
├── electron/
│   ├── main/
│   ├── preload/
│   ├── ipc/
│   └── terminal/
├── src/
│   ├── components/
│   ├── features/
│   │   ├── projects/
│   │   ├── agents/
│   │   ├── sessions/
│   │   ├── terminal/
│   │   ├── layouts/
│   │   └── settings/
│   ├── hooks/
│   ├── stores/
│   ├── services/
│   └── types/
├── database/
├── tests/
├── docs/
└── package.json
```

A estrutura poderá ser adaptada conforme decisões arquiteturais justificadas.

Criar documentação técnica e ADRs para decisões importantes.

---

## 15. Distribuição

Entregar uma aplicação Windows instalável.

Requisitos:

- Instalador `.exe`.
- Build de produção.
- Atalho no menu Iniciar.
- Persistência dos dados entre atualizações.
- Atualização sem perder projetos ou sessões.
- Ícone próprio.
- Nome Agent Desktop.
- Documentação de instalação e utilização.

Não depender de abrir um navegador manualmente para utilizar o aplicativo.

---

## 16. Estratégia de desenvolvimento

Não implemente tudo de uma vez.

Trabalhe em fases.

### Fase 1 — Terminal funcional

Criar Electron, React, node-pty e xterm.js.

Conseguir abrir um PowerShell real e executar comandos.

Validar entrada, saída, rolagem e redimensionamento.

### Fase 2 — Múltiplos terminais

Implementar painéis, grade, abas e sessões independentes.

Testar 4 e 8 terminais.

### Fase 3 — Projetos e persistência

Implementar SQLite, organização por projetos, layouts e histórico.

### Fase 4 — Agentes

Implementar perfis para Claude Code, Codex e outros CLIs.

Implementar identificação e retomada de sessões.

### Fase 5 — Interface e experiência

Polir a interface, indicadores, menus, atalhos e configurações.

### Fase 6 — Qualidade e distribuição

Testes completos, correções, build e instalador Windows.

---

## 17. Instruções para a IA desenvolvedora

Você atuará como arquiteto de software e engenheiro de software sênior.

Antes de implementar:

1. Analise os requisitos.
2. Identifique riscos técnicos.
3. Pesquise as APIs e documentações oficiais das bibliotecas.
4. Proponha a arquitetura.
5. Identifique especialmente os riscos de ConPTY, node-pty e xterm.js no Windows.
6. Apresente o plano de implementação.

Durante o desenvolvimento:

- Escreva código real e funcional.
- Não substitua funcionalidades por mocks.
- Não crie botões sem comportamento.
- Não simule agentes.
- Não utilize APIs externas de IA.
- Não solicite credenciais de provedores.
- Não ignore erros.
- Não esconda limitações técnicas.
- Crie testes para os problemas encontrados.
- Documente as decisões arquiteturais.
- Mantenha o projeto executável ao final de cada fase.

**Prioridade absoluta: estabilidade do terminal, preservação do histórico, rolagem e integridade da entrada do teclado.**

Uma interface bonita não compensa um terminal que perde texto ou não permite consultar o histórico.

O resultado esperado é um aplicativo desktop Windows estável, capaz de gerenciar vários agentes de programação reais, com terminais independentes, sessões persistentes e uma experiência visual tão boa quanto ou melhor que o Alethe. 