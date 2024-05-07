import TokenDetailsComponent from "@/components/tokens/TokenDetails";

export const runtime = "edge";
import {
  deleteIJWTRegistry,
  getIJWTRegistry,
} from "@/app/actions/i-jwt-registry";
import { listChannels } from "@/app/actions/channels";

export default function TokenDetailsPage() {
  return (
    <TokenDetailsComponent
      getIJWTRegistry={getIJWTRegistry}
      deleteIJWTRegistry={deleteIJWTRegistry}
      listChannels={listChannels}
    />
  );
}
