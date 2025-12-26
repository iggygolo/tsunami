import { Waves } from 'lucide-react';

export default function Footer() {
  return (
    <div className="text-center mt-8 pb-8 mt-1 flex justify-center">
      <Waves className="w-6 h-6 stroke-[2.5] text-cyan-500 mr-2" />
      <span className="bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent font-medium">
        Tsunami
      </span>
    </div>
  );
}
