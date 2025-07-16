import PartnersListComponent from '@/components/partners/PartnersListComponent';
import { listInvites, declineInvite, togglePartnership } from '../actions/partners';

export default function PartnersPage() {
    return (
        <PartnersListComponent
            listInvites={listInvites}
            declineInvite={declineInvite}
            togglePartnership={togglePartnership}
        />
    );
}
