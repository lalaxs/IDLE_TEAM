import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/check-in.css";
import { GameApp } from "./app/GameApp";
import { mountViewportFit } from "./ui/viewportFit";

const stage = document.querySelector<HTMLElement>("#fit-stage")!;
const root = document.querySelector<HTMLElement>("#app")!;
const unmountViewportFit = mountViewportFit(stage, root);
let app: GameApp | null = null;

try {
  app = new GameApp(root);
} catch (error) {
  console.error("Game failed to start", error);
  root.innerHTML = `
    <section class="boot-screen error-screen">
      <div class="boot-emblem" aria-hidden="true">!</div>
      <strong>远征暂时无法开始</strong>
      <span>请刷新页面，或尝试更新浏览器后重试。</span>
      <button onclick="location.reload()">重新载入</button>
    </section>
  `;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app?.destroy();
    unmountViewportFit();
  });
}
