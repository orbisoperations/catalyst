import DataChannelListComponents from "@/components/channels/ListChannels";
import { listChannels } from "../actions/channels";

export default function DataChannelListPage() {
  return <DataChannelListComponents listChannels={listChannels} />;
}
