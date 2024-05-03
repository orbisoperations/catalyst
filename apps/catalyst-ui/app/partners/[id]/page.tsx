import PartnerDetailedComponent from "@/components/partners/PartnerDetailedComponent";
import { listPartnersChannels } from "@/app/actions/channels";
export const runtime = "edge";
export default function PartnerDetailPage() {
  return (
    <PartnerDetailedComponent listPartnersChannels={listPartnersChannels} />
  );
}
