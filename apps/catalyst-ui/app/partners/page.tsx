import PartnersListComponent from "@/components/partners/PartnersListComponent";
import { listInvites } from "../actions/partners";
export const runtime = "edge";

export default function PartnersPage() {
  return <PartnersListComponent listInvites={listInvites} />;
}
