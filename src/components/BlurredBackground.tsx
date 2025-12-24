interface BlurredBackgroundProps {
  image?: string;
}

export function BlurredBackground({ image }: BlurredBackgroundProps) {
  if (!image) return null;

  return (
    <>
      <div 
        className="absolute top-0 left-0 right-0 bottom-0 bg-cover bg-center blur-3xl opacity-70 pointer-events-none"
        style={{
          backgroundImage: `url(${image})`
        }}
      >
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/60 pointer-events-none" />
      </div>
    </>
  );
}