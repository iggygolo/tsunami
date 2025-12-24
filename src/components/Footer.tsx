import { Waves } from 'lucide-react';
import { useMusicConfig } from '@/hooks/useMusicConfig';

export default function Footer() {
  const podcastConfig = useMusicConfig();

  return (
    <div className="text-center mt-8 pb-8">
      <p className="text-sm text-muted-foreground">
        {podcastConfig.music.copyright}
      </p>
      <p className="text-sm mt-2 text-center">
        <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent font-medium">
          Powered by Tsunami
        </span>
      </p>
      <div className="mt-1 flex justify-center">
        <Waves className="w-6 h-6 stroke-[2.5] text-purple-500" />
      </div>
    </div>
  );
}
