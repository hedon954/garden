export type SandboxSizeData = {
  type?: string;
  fid?: string;
  height?: unknown;
};

/** A resize is from this frame only when both the window and the frame id match. */
export function acceptSandboxSizeMessage(
  data: SandboxSizeData | null | undefined,
  fid: string,
  source: unknown,
  contentWindow: unknown,
): boolean {
  if (!data || (data.type !== "ux:size" && data.type !== "garden:resize")) return false;
  return contentWindow != null && source === contentWindow && data.fid === fid;
}
