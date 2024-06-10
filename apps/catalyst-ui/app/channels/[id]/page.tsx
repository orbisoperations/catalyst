import {
  deleteChannel,
  getChannel,
  handleSwitch,
  updateChannel,
  getChannelSchema,
} from "@/app/actions/channels";
import DataChannelDetailsComponent from "@/components/channels/ChannelDetails";
export const runtime = "edge";

export default function DataChannelDetailsPage() {
  return (
    <DataChannelDetailsComponent
      // getChannelSchema={getChannelSchema}
      // updateChannelSchema={updateChannelSchema}
      createChannelSchema={createChannelSchema}
      // deleteChannelSchema={deleteChannelSchema}
      updateChannel={updateChannel}
      deleteChannel={deleteChannel}
      channelDetails={getChannel}
      handleSwitch={handleSwitch}
    />
  );
}
