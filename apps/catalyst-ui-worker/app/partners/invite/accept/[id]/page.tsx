import AcceptInviteComponent from "@/components/partners/AcceptInviteComponent";

import {
  acceptInvite,
  declineInvite,
  readInvite,
} from "@/app/actions/partners";
export default function AcceptInvitePage() {
  return (
    <AcceptInviteComponent
      acceptInvite={acceptInvite}
      declineInvite={declineInvite}
      readInvite={readInvite}
    />
  );
}
