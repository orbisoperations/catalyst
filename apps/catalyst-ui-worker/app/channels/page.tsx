import DataChannelListComponents from '@/components/channels/ListChannels';
import { listChannels, deleteChannel } from '../actions/channels';

export default function DataChannelListPage() {
    return <DataChannelListComponents listChannels={listChannels} deleteChannel={deleteChannel} />;
}
