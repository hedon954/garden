"use client";

import { useEffect, useRef, useState } from "react";
import { buildSrcdoc, isHttpsUrl, readSandboxMessage, sandboxRemote } from "../../host.mjs";
import { asString, propValue, registerComponents, useHost, useRuntime } from "../runtime";
import type { Env, UiNode } from "../types";
import { useRuntimeText } from "../lang";

function Sandbox({ node, env }: { node: UiNode; env: Env }) {
  const runtime = useRuntime();
  const tx = useRuntimeText();
  const host = useHost();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(180);
  const [srcDoc, setSrcDoc] = useState("");
  const html = asString(propValue(runtime, node, "html", env));
  const css = asString(propValue(runtime, node, "css", env));
  const js = asString(propValue(runtime, node, "js", env));
  const title = asString(propValue(runtime, node, "title", env), tx.interactive);
  const blocked = sandboxRemote(html) || sandboxRemote(css) || sandboxRemote(js);

  useEffect(() => {
    if (blocked) return;
    const paint = () => {
      const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      setSrcDoc(buildSrcdoc({ html, css, js, canPrompt: typeof host.issuePrompt === "function", theme }));
    };
    paint();
    const observer = new MutationObserver(paint);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [blocked, html, css, js, host]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      const message = readSandboxMessage(event.data);
      if (!message) return;
      if (message.type === "height") setHeight(message.height);
      if (message.type === "openUrl" && isHttpsUrl(message.url)) {
        if (host.openUrl) host.openUrl(message.url);
        else window.open(message.url, "_blank", "noopener,noreferrer");
      }
      if (message.type === "issuePrompt") host.issuePrompt?.(message.text);
      if (message.type === "copy") {
        if (host.copy) host.copy(message.text);
        else void navigator.clipboard?.writeText(message.text);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [host]);

  if (blocked) return <p className="garden-ui-error-inline">{blocked}</p>;

  return (
    <iframe
      ref={frameRef}
      className="garden-ui-sandbox"
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      style={{ height }}
    />
  );
}

registerComponents({ Sandbox });
