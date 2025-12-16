import { deleteChannel, getChannel, updateChannel } from '@/app/actions/channels';
import DataChannelDetailsComponent from '@/components/channels/ChannelDetails';

export default function DataChannelDetailsPage() {
    return (
        <DataChannelDetailsComponent
            updateChannel={updateChannel}
            deleteChannel={deleteChannel}
            channelDetails={getChannel}
        />
    );
}
