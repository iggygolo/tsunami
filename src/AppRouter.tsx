import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import Releases from "./pages/Releases";
import Community from "./pages/Community";
import SocialFeed from "./pages/SocialFeed";
import PublishRelease from "./pages/PublishRelease";
import About from "./pages/About";
import DebugAudio from "./pages/DebugAudio";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";
import { PersistentAudioPlayer } from "./components/audio/PersistentAudioPlayer";
import { 
  StudioLayout, 
  Settings as StudioSettings, 
  Releases as StudioReleases, 
  Providers as StudioProviders, 
  Analytics as StudioAnalytics 
} from "./pages/studio/index";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/releases/:releaseId" element={<NIP19Page />} />
        <Route path="/community" element={<Community />} />
        <Route path="/social" element={<SocialFeed />} />
        <Route path="/publish" element={<PublishRelease />} />
        
        {/* Studio nested routes */}
        <Route path="/studio" element={<StudioLayout />}>
          <Route index element={<StudioSettings />} />
          <Route path="settings" element={<StudioSettings />} />
          <Route path="releases" element={<StudioReleases />} />
          <Route path="providers" element={<StudioProviders />} />
          <Route path="analytics" element={<StudioAnalytics />} />
        </Route>
        
        <Route path="/about" element={<About />} />
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