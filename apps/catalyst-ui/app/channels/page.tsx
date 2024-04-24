import DataChannelListComponents from "@/components/channels/ListChannels";
import { listChannels } from "../actions/channels";
import { getPublicKey } from "../actions/tokens";
import { useEffect } from "react";
export const runtime = "edge";
export default function DataChannelListPage() {
  getPublicKey().then((res) => {
    console.log(res);
  });
  return <DataChannelListComponents listChannels={listChannels} />;
}
