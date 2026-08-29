import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div class="eyebrow">ZIA / CONTROL CENTER</div>
      <h1>把想法丟進來，讓它開始運轉。</h1>
      <p class="lead">這是 Zia 的第一版可開發介面。之後可以擴充成個人 AI 中控台、旅遊助手、投資追蹤器、餐廳營運工具或其他模組。</p>
      <div class="actions">
        <button id="startBtn" class="primary">啟動 Zia</button>
        <button id="statusBtn" class="ghost">查看狀態</button>
      </div>
    </section>

    <section class="grid" aria-label="Zia modules">
      <article class="card">
        <span class="icon">✦</span>
        <h2>AI Workspace</h2>
        <p>集中任務、想法、提示詞與自動化流程。</p>
      </article>
      <article class="card">
        <span class="icon">◉</span>
        <h2>Live Dashboard</h2>
        <p>預留即時資料、通知、價格與狀態卡片。</p>
      </article>
      <article class="card">
        <span class="icon">⌁</span>
        <h2>Modules</h2>
        <p>後續可自由接旅遊、投資、餐廳、遊戲等功能。</p>
      </article>
    </section>

    <section class="console" id="console">
      <div class="dot"></div>
      <span id="consoleText">SYSTEM READY</span>
    </section>
  </main>
`

const consoleText = document.querySelector('#consoleText')

document.querySelector('#startBtn').addEventListener('click', () => {
  consoleText.textContent = 'ZIA ONLINE · READY FOR NEXT MODULE'
})

document.querySelector('#statusBtn').addEventListener('click', () => {
  consoleText.textContent = `STATUS OK · ${new Date().toLocaleString('zh-TW')}`
})
