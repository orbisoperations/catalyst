import { listChannels } from "@/app/actions/channels";
import { signJWT } from "@/app/actions/tokens";
import CreateTokensForm from "@/components/tokens/CreateTokenForm";
export const runtime = "edge";
export default function TokensCreatePage() {
  return <CreateTokensForm signToken={signJWT} listChannels={listChannels} />;
}
