import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import Releases from "./pages/Releases";
import Community from "./pages/Community";
import DebugAudio from "./pages/DebugAudio";
import { NIP19Page } from "./pages/NIP19Page";
import { TrackPage } from "./pages/TrackPage";
import { ReleasePage } from "./pages/ReleasePage";
import NotFound from "./pages/NotFound";
import { PersistentAudioPlayer } from "./components/audio/PersistentAudioPlayer";
import { 
  StudioLayout, 
  ArtistSettings, 
  Providers as StudioProviders, 
  Analytics as StudioAnalytics
} from "./pages/studio/index";
import { TracksPage } from "./pages/studio/TracksPage";
import { CreateTrackPage } from "./pages/studio/CreateTrackPage";
import { EditTrackPage } from "./pages/studio/EditTrackPage";
import { PlaylistsPage } from "./pages/studio/PlaylistsPage";
import { CreatePlaylistPage } from "./pages/studio/CreatePlaylistPage";
import { EditPlaylistPage } from "./pages/studio/EditPlaylistPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/releases/:releaseId" element={<NIP19Page />} />
        <Route path="/community" element={<Community />} />
        
        {/* Nostr navigation routes */}
        <Route path="/track/:naddr" element={<TrackPage />} />
        <Route path="/release/:naddr" element={<ReleasePage />} />
        
        {/* Studio nested routes */}
        <Route path="/studio" element={<StudioLayout />}>
          <Route index element={<TracksPage />} />
          <Route path="tracks" element={<TracksPage />} />
          <Route path="tracks/new" element={<CreateTrackPage />} />
          <Route path="tracks/edit/:trackId" element={<EditTrackPage />} />
          <Route path="playlists" element={<PlaylistsPage />} />
          <Route path="playlists/new" element={<CreatePlaylistPage />} />
          <Route path="playlists/edit/:playlistId" element={<EditPlaylistPage />} />
          <Route path="settings" element={<ArtistSettings />} />
          <Route path="providers" element={<StudioProviders />} />
          <Route path="analytics" element={<StudioAnalytics />} />
        </Route>
        
        <Route path="/debug-audio" element={<DebugAudio />} />
        {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
        <Route path="/:nip19" element={<NIP19Page />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <PersistentAudioPlayer />
    </BrowserRouter>
  );
}
export default AppRouter;