import { useNostr } from "@nostrify/react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useCurrentUser } from "./useCurrentUser";

import type { NostrEvent } from "@nostrify/nostrify";

export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => {
      if (user) {
        const tags = t.tags ?? [];

        // Add the client tag if it doesn't exist
        if (location.protocol === "https:" && !tags.some(([name]) => name === "client")) {
          tags.push(["client", location.hostname]);
        }

        const event = await user.signer.signEvent({
          kind: t.kind,
          content: t.content ?? "",
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        // Use longer timeout for publishing (15 seconds) to allow relays to respond
        // Even if some relays fail, as long as one succeeds, the event is published
        try {
          console.log('Publishing event to relay:', {
            kind: event.kind,
            created_at: event.created_at,
            content_preview: event.content.substring(0, 100),
            tags: event.tags
          });
          
          const result = await nostr.event(event, { signal: AbortSignal.timeout(15000) });
          console.log('Relay accepted event:', result);
        } catch (error) {
          // Log error but don't fail - if any relay accepted it, we're good
          console.warn("Relay rejected or failed to accept the event:", {
            error: error instanceof Error ? error.message : String(error),
            eventKind: event.kind,
            eventCreatedAt: event.created_at
          });
          throw error;
        }

        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", {
        eventId: data.id,
        kind: data.kind,
        created_at: data.created_at,
        timestamp: new Date(data.created_at * 1000).toISOString()
      });
    },
  });
}