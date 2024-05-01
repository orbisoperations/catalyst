import PartnersListComponent from "@/components/partners/PartnersListComponent";
import { listInvites, declineInvite } from "../actions/partners";
export const runtime = "edge";

export default function PartnersPage() {
  return (
    <PartnersListComponent
      listInvites={listInvites}
      declineInvite={declineInvite}
    />
  );
}
