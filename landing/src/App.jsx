import Dachshund from '@dachshund_framework/core';
import Home from './pages/Home';

const app = new Dachshund({
  baseUrl: 'https://lucodifier.github.io/texugo',
  scrollToTop: true
});

app.route('/', Home, {
  title: 'Texugo — Gerenciador de agentes de IA em terminais reais',
  description: 'Claude Code, Codex, Freebuff, PowerShell e Bash lado a lado, por projeto, com retomada automática de sessões.',
  keywords: 'texugo, claude code, codex, terminal, agentes de ia'
});

export default app;
