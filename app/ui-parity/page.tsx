import Image from "next/image";
import { ParityInteractions } from "../../ui/react/parity";
import { siteLang } from "../lib/i18n";

// Internal comparison page (docs/intelligent-ui-parity.md): Garden's renders next
// to the ChatGPT originals. Kept out of search, so it has no canonical address.
export const metadata = { robots: { index: false, follow: false } };

const zhSlices = [
  { label: "商品销售", value: 78.2, color: "#539af8" },
  { label: "平台与营销服务", value: 9.4, color: "#6bc67f" },
  { label: "物流及其他服务", value: 12.4, color: "#ef8b57" },
];

const enSlices = [
  { label: "Product sales", value: 78.2, color: "#539af8" },
  { label: "Marketplace & marketing", value: 9.4, color: "#6bc67f" },
  { label: "Logistics & other services", value: 12.4, color: "#ef8b57" },
];

const slices = siteLang === "en" ? enSlices : zhSlices;

function ring(start: number, sweep: number) {
  const cx = 371;
  const cy = 181;
  const outer = 137.28;
  const inner = 70.4;
  const end = start + sweep;
  const point = (radius: number, angle: number) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  const large = sweep > Math.PI ? 1 : 0;
  const [x0, y0] = point(outer, start);
  const [x1, y1] = point(outer, end);
  const [x2, y2] = point(inner, end);
  const [x3, y3] = point(inner, start);
  return `M ${x0} ${y0} A ${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`;
}

function Arrow() {
  return (
    <svg className="garden-ui-flow-arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M12.707 18.707a1 1 0 0 1-1.414 0l-5-5a1 1 0 1 1 1.414-1.414L11 15.586V6a1 1 0 1 1 2 0v9.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5Z" clipRule="evenodd" />
    </svg>
  );
}

function Loop() {
  return (
    <svg className="garden-ui-flow-loop" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3.06956 10.8763C3.6233 6.43564 7.40965 3 12 3C14.2823 3 16.4028 3.85067 18.0118 5.25439V4C18.0118 3.44772 18.4595 3 19.0118 3C19.5641 3 20.0118 3.44772 20.0118 4V8C20.0118 8.55228 19.5641 9 19.0118 9H15C14.4477 9 14 8.55228 14 8C14 7.44772 14.4477 7 15 7H16.9571C15.6756 5.76379 13.9101 5 12 5C8.43107 5 5.48465 7.67174 5.05419 11.1237C4.98585 11.6718 4.48617 12.0607 3.93813 11.9923C3.39009 11.924 3.00122 11.4243 3.06956 10.8763ZM20.0618 12.0077C20.6099 12.076 20.9987 12.5757 20.9304 13.1237C20.3767 17.5644 16.5903 21 12 21C9.72321 21 7.6076 20.1535 5.99998 18.7559V20C5.99998 20.5523 5.55226 21 4.99998 21C4.44769 21 3.99998 20.5523 3.99998 20V16C3.99998 15.4477 4.44769 15 4.99998 15H8.99998C9.55226 15 9.99998 15.4477 9.99998 16C9.99998 16.5523 9.55226 17 8.99998 17H7.04283C8.32432 18.2362 10.0899 19 12 19C15.5689 19 18.5153 16.3283 18.9458 12.8763C19.0141 12.3282 19.5138 11.9393 20.0618 12.0077Z" />
    </svg>
  );
}

export default function UiParityPage() {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const arcs = slices.reduce<{ angle: number; items: Array<(typeof slices)[number] & { path: string }> }>((state, slice) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    return {
      angle: state.angle + sweep,
      items: [...state.items, { ...slice, path: ring(state.angle, sweep) }],
    };
  }, { angle: -Math.PI / 2, items: [] }).items;
  const rows = siteLang === "en"
    ? [
        ["Consumer state", "Reason not to choose PDD", "Economic concept"],
        ["Unaware PDD is cheaper", "No cross-platform comparison", "Information asymmetry, search cost"],
        ["Knows it is cheaper, but hesitant", "Doubts product quality or after-sales", "Perceived risk, trust cost"],
        ["Knows it is cheaper and authentic", "Used to Tmall, reluctant to switch", "Switching cost, consumer inertia"],
      ]
    : [
        ["消费者状态", "不选择拼多多的原因", "对应的经济学概念"],
        ["不知道拼多多更便宜", "没有进行跨平台比价", "信息不对称、搜索成本"],
        ["知道更便宜，但不放心", "怀疑商品品质、商家或售后", "感知风险、信任成本"],
        ["知道更便宜，也相信是正品", "习惯使用天猫，不想迁移", "转换成本、消费惯性"],
      ];
  return (
    <main className="garden-ui" lang="en-US" style={{ margin: 0, border: 0, background: "#fff", padding: 32 }}>
      <section id="parity-stat" className="garden-ui-card" style={{ width: 768, marginBottom: 32 }}>
        <p className="garden-ui-kicker">{siteLang === "en" ? "2025 Douyin E-Commerce Report" : "2025 抖音电商发展数据报告"}</p>
        <p className="garden-ui-title-2xl">+49%</p>
        <p className="garden-ui-subtitle">{siteLang === "en" ? "Shelf-commerce GMV YoY growth" : "货架场景成交额同比增长"}</p>
        <p className="garden-ui-text-sm">{siteLang === "en" ? "Measured from Aug 2024 to Aug 2025." : "统计期为 2024 年 8 月至 2025 年 8 月。"}</p>
        <p className="garden-ui-caption">
          {siteLang === "en" ? "Official Douyin E-Commerce report via Xinhua. Does not represent overall GMV growth." : "抖音电商官方报告，经新华社报道。该增速不能直接代表抖音电商整体 GMV 增速。"}<a id="parity-cite" className="garden-ui-cite" href="https://www.news.cn">
            <Image src="https://www.google.com/s2/favicons?domain=www.news.cn&sz=32" alt="" width={12} height={12} unoptimized />
            Xinhua Net
          </a>
        </p>
      </section>
      <section id="parity-card" className="garden-ui-card" style={{ width: 378, marginBottom: 32 }}>
        <p className="garden-ui-kicker">{siteLang === "en" ? "2025 Taobao & Tmall Product Index Scale" : "2025 年淘宝天猫商品索引规模"}</p>
        <p className="garden-ui-title-2xl">{siteLang === "en" ? "2B+" : "20 亿+"}</p>
        <p className="garden-ui-text-xs">{siteLang === "en" ? "Product items" : "商品条目"}</p>
        <p className="garden-ui-caption">
          {siteLang === "en" ? "Alibaba disclosed that its AI search and recommendation system indexes over 2 billion items." : "阿里巴巴披露其 AI 搜索推荐系统索引了超过 20 亿商品条目。"}<a className="garden-ui-cite" href="https://www.alibabagroup.com">
            <Image src="https://www.google.com/s2/favicons?domain=www.alibabagroup.com&sz=32" alt="" width={12} height={12} unoptimized />
            Alibaba Group
          </a>
        </p>
      </section>
      <section id="parity-pie" className="garden-ui-pie" style={{ width: 742, marginBottom: 32 }}>
        <div className="garden-ui-pie-chart">
          <svg viewBox="0 0 742 400" role="img" aria-label={siteLang === "en" ? "Revenue mix" : "收入结构"}>
            {arcs.map((arc) => <path key={arc.label} d={arc.path} fill={arc.color} />)}
          </svg>
          <ul className="garden-ui-legend">
            {arcs.map((arc) => (
              <li key={arc.label}><span className="garden-ui-swatch" style={{ background: arc.color }} />{arc.label}</li>
            ))}
          </ul>
        </div>
        <p className="garden-ui-pie-note">{siteLang === "en" ? "JD.com FY2025; product and service revenues use different accounting recognition." : "京东集团2025财年；商品与服务收入的会计确认方式不同。"}</p>
      </section>
      <section id="parity-table" style={{ width: 768, marginBottom: 32 }}>
        <table className="garden-ui-table" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 265.9 }} />
            <col style={{ width: 278.5 }} />
            <col style={{ width: 223.6 }} />
          </colgroup>
          <thead>
            <tr>{rows[0].map((cell) => <th key={cell}>{cell}</th>)}</tr>
          </thead>
          <tbody>
            {rows.slice(1).map((row) => (
              <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>
      <section id="parity-flow" className="garden-ui-card garden-ui-flow" style={{ width: 768 }}>
        <p>{siteLang === "en" ? "Broad merchant and product supply" : "丰富的商家与商品供给"}</p>
        <Arrow />
        <p>{siteLang === "en" ? "Attracts consumers with diverse needs" : "吸引更多具有不同需求的消费者"}</p>
        <Arrow />
        <p>{siteLang === "en" ? "Larger GMV opportunity attracts merchants" : "更大的潜在成交机会吸引商家"}</p>
        <Arrow />
        <p>{siteLang === "en" ? "Richer supply and transaction data" : "更丰富的供给与交易数据"}</p>
        <Loop />
      </section>
      {siteLang === "en" ? <ParityInteractions lang="en" /> : <ParityInteractions />}
    </main>
  );
}
