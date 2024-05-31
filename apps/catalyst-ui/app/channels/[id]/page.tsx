import {
  deleteChannel,
  getChannel,
  handleSwitch,
  updateChannel,
} from "@/app/actions/channels";
import DataChannelDetailsComponent from "@/components/channels/ChannelDetails";
export const runtime = "edge";

export default function DataChannelDetailsPage() {
  return (
    <DataChannelDetailsComponent
      updateChannel={updateChannel}
      deleteChannel={deleteChannel}
      channelDetails={getChannel}
      channelSchema={getChannelSchema}
      handleSwitch={handleSwitch}
    />
  );
}
