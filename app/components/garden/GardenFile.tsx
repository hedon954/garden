// Server component: the card for `garden file`. Only the 预览 control is a client island.
import { ui, type UiLang } from "../../lib/i18n";
import { blockFiles, fileMeta } from "../../../ui/garden/file-block.mjs";
import { ActionGlyph, FileGlyph, safeFileHref } from "./file-icons";
import { FilePreview, type PreviewFile } from "./FilePreview";

type FileEntry = {
  name?: string;
  title?: string;
  note?: string;
  url?: string;
  format?: string;
  size?: number;
  icon?: string;
  remote?: boolean;
  preview?: string;
  /** Markdown: the prerendered preview's address (fetched when the preview opens). */
  previewSrc?: string;
};

const PREVIEWS = new Set(["md", "html", "pdf"]);

export function GardenFile({ props, lang }: { props: Record<string, unknown>; lang?: UiLang }) {
  const t = ui(lang);
  const block = blockFiles(props) as { layout?: string; title?: string; files: FileEntry[] };
  const files = block.files.filter((file) => safeFileHref(file.url));
  if (!files.length) return null;
  const group = block.layout === "group";
  return (
    <div className={group ? "gf group" : "gf single"} data-garden-file="">
      {group && block.title ? <div className="gf-title">{block.title}</div> : null}
      {files.map((file, index) => {
        const href = safeFileHref(file.url);
        const name = file.name || file.title || t.file;
        const title = file.title || name;
        const meta = fileMeta(file);
        const previewSrc = file.preview === "md" ? safeFileHref(file.previewSrc) : "";
        const preview = !file.remote && PREVIEWS.has(file.preview ?? "") && (file.preview !== "md" || previewSrc) ? (file.preview as PreviewFile["preview"]) : null;
        const previewFile: PreviewFile | null = preview ? { title, name, meta, icon: file.icon ?? "file", url: href, preview, ...(previewSrc ? { src: previewSrc } : {}) } : null;
        return (
          <div className="gf-row" key={`${href}-${index}`} data-remote={file.remote ? "true" : undefined}>
            <span className="gf-ico" aria-hidden="true"><FileGlyph kind={file.icon} /></span>
            <div className="gf-main">
              <div className="gf-name" title={title}>{title}</div>
              {file.note ? <div className="gf-desc">{file.note}</div> : null}
              {meta ? <div className="gf-meta">{meta}</div> : null}
            </div>
            <div className="gf-act">
              {previewFile ? <FilePreview file={previewFile} compact={group} lang={lang} /> : null}
              {file.remote ? (
                <a className="gf-btn icon" href={href} target="_blank" rel="noopener noreferrer" aria-label={t.openNamedInTab(name)} title={t.openInTab}>
                  <ActionGlyph name="external" />
                </a>
              ) : null}
              {group ? (
                <a className="gf-btn icon" href={href} download={file.remote ? undefined : name} aria-label={t.downloadNamed(name)} title={t.download}>
                  <ActionGlyph name="download" />
                </a>
              ) : (
                <a className="gf-btn pri" href={href} download={file.remote ? undefined : name} aria-label={t.downloadNamed(name)}>
                  <ActionGlyph name="download" />
                  <span className="gf-lb">{t.download}</span>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
