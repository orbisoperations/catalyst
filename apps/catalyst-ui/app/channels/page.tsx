import DataChannelListComponents from "@/components/channels/ListChannels";
import { listChannels } from "../actions/channels";
export const runtime = "edge";
export default function DataChannelListPage() {
  return <DataChannelListComponents listChannels={listChannels} />;
}
