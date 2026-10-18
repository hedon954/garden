/** Header mark. The same URL is the browser icon. */
export function SiteMark({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="sh-mark" src={src} alt="" />;
}
