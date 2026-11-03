/** The sentence an editor inserts into a fresh ```garden compose fence. */
export const COMPOSE_INTENT =
  "用三张卡加向下箭头讲清 sync → build → validate；读者点每一步，下面展开对应说明。";

/** Compiled shape of that sentence. Catalog, cheat sheet, and tests share it. */
export const COMPOSE_EXAMPLE_BODY = `title: 站点发布流水线
caption: 三步串起来，点哪步看哪步
intent: |
  ${COMPOSE_INTENT}
steps:
  - id: sync
    title: sync
    text: 同步内容与配置
  - id: build
    title: build
    text: 生成静态 HTML
  - id: validate
    title: validate
    text: 检查后再上线
notes:
  - for: sync
    text: 先对齐远程与本地材料
  - for: build
    text: 构建期把 compose 渲进正文
  - for: validate
    text: 钩子拦住未编译的想法块
`;
