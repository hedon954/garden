// Offline sandbox recipe, not a Compose component or an automatic graph router.
// root: positioned DOM container; nodes: unique data-node ids.
// edges: {from,to,route?:"straight"|"elbow",dashed?:boolean}; no obstacle router.
function mountMeasuredConnectors(root, edges) {
  const namespace = 'http://www.w3.org/2000/svg';
  const nodes = new Map([...root.querySelectorAll('[data-node]')].map(node => [node.dataset.node, node]));
  if (nodes.size !== root.querySelectorAll('[data-node]').length) throw new Error('Duplicate connector node id');
  for (const edge of edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error('Unknown connector node id');
    if (edge.route !== undefined && !['straight', 'elbow'].includes(edge.route)) throw new Error('Unknown connector route');
    if (edge.dashed !== undefined && typeof edge.dashed !== 'boolean') throw new Error('Connector dashed must be boolean');
  }
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('connector-lines');
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' });
  const paths = edges.map(edge => {
    const line = document.createElementNS(namespace, 'path');
    line.dataset.from = edge.from;
    line.dataset.to = edge.to;
    line.dataset.route = edge.route ?? 'straight';
    if (edge.dashed) line.setAttribute('stroke-dasharray', '6 4');
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '1.5');
    svg.append(line);
    return line;
  });
  root.prepend(svg);
  let active = true;
  let scheduled = 0;
  function draw() {
    scheduled = 0;
    if (!active || !svg.isConnected) return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse();
    for (const [index, edge] of edges.entries()) {
      const from = nodes.get(edge.from).getBoundingClientRect();
      const to = nodes.get(edge.to).getBoundingClientRect();
      const a = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
      const b = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
      // Prefer a genuinely separated axis: tall peer cards can overlap vertically.
      // A center-only choice could send the first elbow segment back into its node.
      const separatedX = from.right <= to.left || to.right <= from.left;
      const separatedY = from.bottom <= to.top || to.bottom <= from.top;
      const horizontal = separatedX !== separatedY ? separatedX : Math.abs(b.x - a.x) > Math.abs(b.y - a.y);
      if (horizontal) {
        const forward = b.x > a.x;
        a.x = forward ? from.right : from.left;
        b.x = forward ? to.left : to.right;
      } else {
        const forward = b.y > a.y;
        a.y = forward ? from.bottom : from.top;
        b.y = forward ? to.top : to.bottom;
      }
      const start = new DOMPoint(a.x, a.y).matrixTransform(inverse);
      const end = new DOMPoint(b.x, b.y).matrixTransform(inverse);
      const points = [start];
      if (edge.route === 'elbow') {
        // Mid-gap orthogonal route, recalculated from actual node bounds.
        // Intentionally no obstacle search or automatic node placement.
        if (horizontal) {
          const x = (start.x + end.x) / 2;
          points.push({ x, y: start.y }, { x, y: end.y });
        } else {
          const y = (start.y + end.y) / 2;
          points.push({ x: start.x, y }, { x: end.x, y });
        }
      }
      points.push(end);
      paths[index].setAttribute('d', points.map((point, i) => `${i ? 'L' : 'M'}${point.x},${point.y}`).join(' '));
    }
  }
  function schedule() { if (active && !scheduled) scheduled = requestAnimationFrame(draw); }
  const observer = new ResizeObserver(schedule);
  observer.observe(root);
  for (const node of nodes.values()) observer.observe(node);
  const changes = new MutationObserver(schedule);
  // Position-only style/class changes do not trigger ResizeObserver.
  // Do not observe path `d` writes: measurement must not reschedule itself.
  changes.observe(root, { attributes: true, attributeFilter: ['style', 'class'], subtree: true });
  window.addEventListener('resize', schedule);
  document.fonts?.ready.then(schedule);
  schedule();
  return () => {
    active = false;
    cancelAnimationFrame(scheduled);
    observer.disconnect();
    changes.disconnect();
    window.removeEventListener('resize', schedule);
    svg.remove();
  };
}
