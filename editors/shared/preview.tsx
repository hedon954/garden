import * as preview from "../../ui/preview/index";
import { renderComposePreview } from "../../app/components/garden/ComposePreview";
import type { PreviewOptions } from "../../ui/preview/index";

export function render(element: HTMLElement, source: string, options: PreviewOptions = {}) {
  let current = options;
  const host = (next: PreviewOptions) => ({ ...next, renderBlock: renderComposePreview });
  const mounted = preview.render(element, source, host(current));
  return {
    update(nextSource: string, nextOptions: PreviewOptions = current) {
      current = nextOptions;
      mounted.update(nextSource, host(current));
    },
    destroy: mounted.destroy,
  };
}

export function renderCatalog(element: HTMLElement, options: Parameters<typeof preview.renderCatalog>[1] = {}) {
  return preview.renderCatalog(element, { ...options, renderBlock: renderComposePreview });
}
