import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { ReleasePage } from '@/components/music/ReleasePage';
import { ProfilePage } from '@/components/ProfilePage';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier, releaseId } = useParams<{ nip19: string; releaseId: string }>();

  // Handle explicit release routes (/releases/:releaseId)
  if (releaseId) {
    // releaseId is just the event ID, not a composite format
    return (
      <ReleasePage
        eventId={releaseId}
      />
    );
  }

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

    case 'note': {
      // Handle note1 identifiers - could be podcast releases (kind 54)
      const noteId = decoded.data;
      return (
        <ReleasePage
          eventId={noteId}
        />
      );
    }

    case 'nevent': {
      // Handle nevent1 identifiers - could be podcast releases (kind 54)
      const nevent = decoded.data;
      return (
        <ReleasePage
          eventId={nevent.id}
        />
      );
    }

    case 'naddr': {
      // Handle addressable events (music playlists are kind 34139, tracks are kind 36787)
      const naddr = decoded.data;
      if (naddr.kind === MUSIC_KINDS.MUSIC_PLAYLIST) {
        // This is a music playlist (release) - pass the addressable event parameters
        return (
          <ReleasePage
            addressableEvent={{
              pubkey: naddr.pubkey,
              kind: naddr.kind,
              identifier: naddr.identifier
            }}
          />
        );
      } else if (naddr.kind === MUSIC_KINDS.MUSIC_TRACK) {
        // This is an individual music track - pass the addressable event parameters
        return (
          <ReleasePage
            addressableEvent={{
              pubkey: naddr.pubkey,
              kind: naddr.kind,
              identifier: naddr.identifier
            }}
          />
        );
      }
      // For other addressable event kinds, show placeholder
      return <div>Addressable event placeholder</div>;
    }

    default:
      return <NotFound />;
  }
}