import { TikTokMrdpImportFlow } from "@/components/tiktok/tiktok-mrdp-import-flow";
import { PageHeader } from "@/components/pages/page-header";

export const metadata = {
  title: "TikTok MRDP Import · Avaken Finance OS",
  description: "Upload your TikTok Shop MRDP annual tax report and import revenue into your ledger",
};

export default function TikTokMrdpImportPage() {
  return (
    <div>
      <PageHeader
        title="TikTok MRDP import"
        description="Upload the official annual tax report from TikTok Shop. Review quarterly revenue, assign to Personal or Avaken Ltd, then commit to your ledger."
      />
      <TikTokMrdpImportFlow />
    </div>
  );
}
