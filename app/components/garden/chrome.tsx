"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

const COPY_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <rect x="5.25" y="5.25" width="8.5" height="8.5" rx="1.5" />
    <path d="M10.75 5.25V3.75a1.5 1.5 0 0 0-1.5-1.5h-5.5a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h1.5" />
  </svg>
);
const ENTER_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
  </svg>
);
const EXIT_ICON = (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5" />
  </svg>
);

function writeClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  return new Promise<void>((resolve, reject) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      if (document.execCommand("copy")) resolve();
      else reject(new Error("copy"));
    } catch (error) {
      reject(error);
    } finally {
      area.remove();
    }
  });
}

export function CopyButton({ getText, label = "复制代码" }: { getText: () => string; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number>(0);

  return (
    <>
      <button
        type="button"
        className={`ux-btn ux-copy${done ? " ux-done" : ""}`}
        aria-label={done ? "已复制" : label}
        title={done ? "已复制" : label}
        onClick={() => {
          const text = getText();
          writeClipboard(text).then(() => {
            setDone(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setDone(false), 1500);
          }).catch(() => setDone(false));
        }}
      >
        {done ? "已复制" : COPY_ICON}
      </button>
      <span className="ux-live" aria-live="polite">{done ? "已复制到剪贴板" : ""}</span>
    </>
  );
}

export function CodeCopy({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="ux-cb" ref={ref}>
      {children}
      <CopyButton getText={() => {
        const pre = ref.current?.querySelector("pre");
        const code = pre?.querySelector("code") ?? pre;
        return (code?.textContent ?? "").replace(/\n$/u, "");
      }} />
    </div>
  );
}

function diffLines(source: string) {
  return source.replace(/\n$/u, "").split("\n").map((line) => {
    const kind = line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "ctx";
    const body = kind === "ctx" ? line.replace(/^ /u, "") : line.slice(1);
    const mark = kind === "add" ? "+" : kind === "del" ? "−" : " ";
    const spoken = kind === "add" ? "（新增）" : kind === "del" ? "（删除）" : "";
    return { kind, body, mark, spoken };
  });
}

export function CodeDiff({
  code,
  diff,
  next,
}: {
  code: ReactNode;
  diff: string;
  next: string;
}) {
  const [tab, setTab] = useState(0);
  const base = useId();
  const tabs = ["代码", "对比上一版"];

  return (
    <div className="g-tabs g-code-group g-codediff" data-g="tabs">
      <div role="tablist" aria-label="代码">
        {tabs.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`${base}-t${index}`}
            aria-controls={`${base}-p${index}`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            onClick={() => setTab(index)}
            onKeyDown={(event) => {
              const nextIndex = event.key === "ArrowRight" || event.key === "ArrowLeft" ? (index + 1) % 2 : -1;
              if (nextIndex < 0) return;
              event.preventDefault();
              setTab(nextIndex);
            }}
          >
            {label}
          </button>
        ))}
        <CopyButton getText={() => {
          if (tab === 1) return next;
          const root = document.getElementById(`${base}-p0`);
          return (root?.innerText ?? "").replace(/\n$/u, "");
        }} />
      </div>
      <div role="tabpanel" id={`${base}-p0`} aria-labelledby={`${base}-t0`} hidden={tab !== 0}>
        {code}
      </div>
      <div role="tabpanel" id={`${base}-p1`} aria-labelledby={`${base}-t1`} hidden={tab !== 1}>
        <pre className="code g-diff">
          <code>
            {diffLines(diff).map((line, index) => (
              <span className={`d-${line.kind}`} key={index}>
                <span className="d-m" aria-hidden="true">{line.mark}</span>
                {line.body}
                {line.spoken ? <span className="vh">{line.spoken}</span> : null}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function fullscreenElement() {
  return document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement || null;
}

export function FullscreenFrame({ children, label = "演示" }: { children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [overlay, setOverlay] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const on = fullscreenElement() === ref.current;
      setActive(on || overlay);
      if (!on && !overlay && restoreRef.current) {
        restoreRef.current.focus();
        restoreRef.current = null;
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [overlay]);

  useEffect(() => {
    if (!overlay) return undefined;
    const root = ref.current;
    document.documentElement.classList.add("ux-lock");
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOverlay(false);
        setActive(false);
        document.documentElement.classList.remove("ux-lock");
        restoreRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, iframe, [tabindex]:not([tabindex='-1'])")]
        .filter((item) => !item.hasAttribute("disabled") && item.getClientRects().length > 0);
      if (!items.length) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      const last = items.length - 1;
      if (index < 0 || (event.shiftKey && index === 0) || (!event.shiftKey && index === last)) {
        event.preventDefault();
        items[index < 0 ? 0 : event.shiftKey ? last : 0].focus();
      }
    };
    const pull = (event: FocusEvent) => {
      if (root && !root.contains(event.target as Node)) buttonRef.current?.focus();
    };
    document.addEventListener("keydown", trap, true);
    document.addEventListener("focusin", pull);
    buttonRef.current?.focus();
    return () => {
      document.documentElement.classList.remove("ux-lock");
      document.removeEventListener("keydown", trap, true);
      document.removeEventListener("focusin", pull);
    };
  }, [overlay]);

  const open = () => {
    const node = ref.current;
    if (!node) return;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const request = node.requestFullscreen || (node as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
    if (request && (document.fullscreenEnabled || (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled)) {
      void request.call(node);
      return;
    }
    setOverlay(true);
    setActive(true);
  };

  const close = () => {
    if (fullscreenElement()) {
      void (document.exitFullscreen?.() || (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen?.());
      return;
    }
    setOverlay(false);
    setActive(false);
    restoreRef.current?.focus();
  };

  return (
    <div ref={ref} className={`ux-fs${overlay ? " ux-fs-on" : ""}`} role={overlay ? "dialog" : undefined} aria-modal={overlay ? true : undefined} aria-label={overlay ? label : undefined}>
      <div className="ux-fsbar">
        <button
          ref={buttonRef}
          type="button"
          className="ux-btn ux-fsb"
          aria-label={active ? "退出全屏" : "全屏"}
          title={active ? "退出全屏" : "全屏"}
          onClick={() => (active ? close() : open())}
        >
          {active ? EXIT_ICON : ENTER_ICON}
        </button>
      </div>
      {children}
    </div>
  );
}

const FRAME_BOOT = `<style>
html,body{background:transparent!important;height:auto!important;min-height:0!important;margin:0;max-width:100%}
body>*{max-width:100%;box-sizing:border-box}
svg,img,canvas,video,table{max-width:100%;height:auto}
</style><script>(function(){
var last=0;
function m(){var b=document.body;if(!b)return;var h=0,cs=getComputedStyle(b);[].forEach.call(b.children,function(e){if(e.tagName==="SCRIPT"||e.tagName==="STYLE")return;var r=e.getBoundingClientRect(),st=getComputedStyle(e);h=Math.max(h,r.bottom+parseFloat(st.marginBottom||0))});h=Math.ceil(h+parseFloat(cs.paddingBottom||0)+parseFloat(cs.marginBottom||0)+2);if(h!==last){last=h;parent.postMessage({type:"ux:size",height:h},"*")}}
function row(root){var nodes=root.children;for(var i=0;i<nodes.length;i++){var e=nodes[i];if(e.tagName==="SCRIPT"||e.tagName==="STYLE"||getComputedStyle(e).display==="none")continue;return e}return null}
function pad(){var b=document.body;if(!b)return;var top=row(b);if(!top)return;var inner=row(top);var target=inner&&top.getBoundingClientRect().height>inner.getBoundingClientRect().height+8?inner:top;target.style.setProperty("box-sizing","border-box");target.style.setProperty("padding-right","44px")}
var q=0;function s(){if(!q){q=1;requestAnimationFrame(function(){q=0;m()})}}
function watch(){[].forEach.call(document.images||[],function(img){if(img.dataset.uxSized)return;img.dataset.uxSized="1";img.addEventListener("load",s);img.addEventListener("error",s)})}
var started=0;function boot(){pad();watch();s();if(started||!window.ResizeObserver)return;started=1;var ro=new ResizeObserver(s);ro.observe(document.documentElement);if(document.body)ro.observe(document.body)}
addEventListener("DOMContentLoaded",boot);addEventListener("load",boot);addEventListener("resize",s);
})()<\/script>`;

export function frameSrcdoc(html: string, title: string) {
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">`;
  const boot = FRAME_BOOT;
  if (/<head[^>]*>/iu.test(html)) return html.replace(/<head[^>]*>/iu, (head) => `${head}${csp}${boot}`);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>${csp}${boot}</head><body>${html}</body></html>`;
}

export function SandboxFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(80);
  const srcDoc = frameSrcdoc(html, title);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = ref.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || (data.type !== "ux:size" && data.type !== "garden:resize")) return;
      const next = Number(data.height);
      if (!Number.isFinite(next)) return;
      if (frame.closest(".ux-fs:fullscreen, .ux-fs-on")) return;
      setHeight(Math.max(60, Math.min(1600, next)));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <FullscreenFrame label={title}>
      <div className="g-sandbox">
        <iframe
          ref={ref}
          title={title}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={srcDoc}
          style={{ height, overflow: "hidden", background: "transparent" }}
        />
      </div>
    </FullscreenFrame>
  );
}
