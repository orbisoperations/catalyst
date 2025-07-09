import { createDataChannel } from '@/app/actions/channels';
import CreateChannelForm from '@/components/channels/CreateChannelForm';

export default function CreateChannelPage() {
    return <CreateChannelForm createDataChannel={createDataChannel} />;
}
