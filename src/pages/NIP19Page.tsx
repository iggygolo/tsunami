import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { ReleasePage } from '@/components/podcast/ReleasePage';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

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
    case 'npub':
    case 'nprofile':
      // AI agent should implement profile view here
      return <div>Profile placeholder</div>;

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
      // Handle addressable events (music playlists are kind 34139)
      const naddr = decoded.data;
      if (naddr.kind === PODCAST_KINDS.MUSIC_PLAYLIST) {
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
      }
      // For other addressable event kinds, show placeholder
      return <div>Addressable event placeholder</div>;
    }

    default:
      return <NotFound />;
  }
}