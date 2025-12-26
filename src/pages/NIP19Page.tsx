import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { ProfilePage } from '@/components/ProfilePage';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string; releaseId: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type } = decoded;

  switch (type) {
    case 'npub': {
      const pubkey = decoded.data;
      return <ProfilePage pubkey={pubkey} />;
    }
    
    case 'nprofile': {
      const nprofile = decoded.data;
      return <ProfilePage pubkey={nprofile.pubkey} />;
    }

    default:
      return <NotFound />;
  }
}