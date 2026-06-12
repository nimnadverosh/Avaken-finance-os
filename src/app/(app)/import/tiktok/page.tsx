import { TikTokImportFlow } from "@/components/tiktok/tiktok-import-flow";
import { PageHeader } from "@/components/pages/page-header";

export const metadata = {
  title: "TikTok Upload · Avaken Finance OS",
  description: "Upload your monthly TikTok Shop earnings report and update the dashboard",
};

export default function TikTokImportPage() {
  return (
    <div>
      <PageHeader
        title="Monthly TikTok upload"
        description="Drop your TikTok Shop earnings export — we parse, aggregate, attribute by month, and refresh the whole dashboard."
      />
      <TikTokImportFlow />
    </div>
  );
}
