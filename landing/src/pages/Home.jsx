import React from 'react';

const REPO = 'https://github.com/lucodifier/texugo';
const DOWNLOAD = REPO + '/releases/latest/download/Texugo-Setup-0.1.0.exe';
const SHOT = import.meta.env.BASE_URL + 'assets/screenshot.png';
const ICON = import.meta.env.BASE_URL + 'assets/icon.png';

const features = [
  { icon: '🧩', title: 'Grade de terminais reais', text: 'ConPTY + xterm: nada de emulação fake. O modo AUTO ajusta a grade para 1, 2, 3, 4 ou 6 janelas, sem slots vazios.' },
  { icon: '🤖', title: 'Qualquer agente de CLI', text: 'Claude Code, Codex, Freebuff, PowerShell, CMD, Git Bash… ou qualquer comando que você cadastrar.' },
  { icon: '♻️', title: 'Sessões que voltam', text: 'Fechou o app? O buffer visual é restaurado e o agente retoma sozinho com resume/continue.' },
  { icon: '📁', title: 'Organizado por projeto', text: 'Cada projeto com seus terminais, branch git ativa e modelo em uso visíveis na barra lateral.' },
  { icon: '🔑', title: 'Zero API keys', text: 'Não intermedia chamadas: usa as CLIs que você já instalou e autenticou. Tudo roda local.' },
  { icon: '⛶', title: 'Foco quando precisa', text: 'Duplo clique no título maximiza um terminal; clique na aba do projeto isola só os dele.' }
];

const steps = [
  ['1', 'Baixe e instale', 'Instalador para Windows 10/11 (x64).'],
  ['2', 'Crie um projeto', 'Aponte para a pasta do seu código.'],
  ['3', 'Abra seus agentes', 'Um clique em Claude, Codex, Freebuff, Bash ou CMD.']
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="container mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={ICON} alt="" className="w-9 h-9 rounded-lg" />
          <span className="text-xl font-extrabold text-white">Texugo</span>
        </div>
        <a href={REPO} className="text-gray-400 hover:text-badger-400 font-medium">GitHub ↗</a>
      </header>

      <section className="container mx-auto px-4 pt-16 pb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-5">
          Todos os seus <span className="gradient-text">agentes de IA</span>,<br />numa só janela
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-9">
          Gerenciador desktop para Windows que roda Claude Code, Codex, Freebuff e shells em terminais reais, lado a lado, organizados por projeto.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a className="btn-primary" href={DOWNLOAD}>⬇ Baixar para Windows</a>
          <a className="btn-ghost" href={REPO}>Ver código</a>
        </div>
        <p className="text-sm text-gray-500 mt-4">v0.1.0 · Windows 10/11 x64 · open source</p>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <img src={SHOT} alt="Texugo com vários agentes de IA em grade, organizados por projeto" className="w-full max-w-5xl mx-auto rounded-xl border border-ink-600 shadow-2xl" />
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-10">Comece em 3 passos</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="w-12 h-12 rounded-full bg-badger-500 text-ink-900 font-extrabold text-xl flex items-center justify-center mx-auto mb-3">{n}</div>
                <h3 className="font-bold text-white mb-1">{t}</h3>
                <p className="text-gray-400">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Stack</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Electron · React · TypeScript · Tailwind · xterm.js · node-pty (ConPTY) · SQLite (sql.js). Projeto em evolução ativa, feito por{' '}
          <a className="text-badger-400 hover:underline" href="https://github.com/lucodifier">CodeHolistic</a>.
        </p>
      </section>

      <footer className="border-t border-ink-600 py-8 text-center text-gray-500 text-sm">
        © CodeHolistic · Site feito com o <a className="text-badger-400" href="https://github.com/lucodifier/dachshund-landing">Dachshund Framework</a>
      </footer>
    </div>
  );
}
