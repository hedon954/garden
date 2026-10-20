import { AdminBlocks } from "../../../components/AdminUiPanels";
import { AdminUiShell, isStaticExport, requireAdminPage, StaticAdminNotice } from "../../../components/AdminUiShell";
import { ui } from "../../../lib/i18n";
import { getSiteUrl } from "../../../lib/site";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";
export const metadata = { title: ui().adminTitleBlocks, robots: { index: false, follow: false } };

export default async function UiBlocksPage() {
  if (isStaticExport()) return <StaticAdminNotice />;
  const user = await requireAdminPage();
  return (
    <AdminUiShell active="/admin/ui/blocks" userName={`@${user.login}`}>
      <AdminBlocks siteUrl={(await getSiteUrl()).replace(/\/+$/u, "")} />
    </AdminUiShell>
  );
}
