import { sendInvite } from "@/app/actions/partners";
import CreateInviteComponent from "@/components/partners/SendInviteComponent";

export default function CreateInvitePage() {
  return <CreateInviteComponent sendInvite={sendInvite} />;
}
