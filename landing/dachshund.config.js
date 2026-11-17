export default {
  global: {
    siteName: 'Texugo',
    baseUrl: 'https://lucodifier.github.io/texugo',
    lang: 'pt-BR',
    css: '/styles.css',
    bundle: '/bundle.js'
  },
  routes: {
    '/': {
      seo: {
        title: 'Texugo — Gerenciador de agentes de IA em terminais reais',
        description: 'Abra Claude Code, Codex, Freebuff, PowerShell e Bash lado a lado numa grade, organizados por projeto, com sessões que voltam de onde pararam. Windows, local e sem API keys.',
        keywords: 'texugo, claude code, codex, terminal, agentes de ia, electron, windows, conpty'
      }
    }
  },
  publicDir: 'public'
};
