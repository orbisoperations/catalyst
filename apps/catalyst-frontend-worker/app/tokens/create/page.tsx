import { listChannels } from "@/app/actions/channels";
import { signJWT } from "@/app/actions/tokens";
import { createIJWTRegistry } from "@/app/actions/i-jwt-registry";
import CreateTokensForm from "@/components/tokens/CreateTokenForm";

export default function TokensCreatePage() {
  return (
    <CreateTokensForm
      signToken={signJWT}
      listChannels={listChannels}
      createIJWTRegistry={createIJWTRegistry}
    />
  );
}
