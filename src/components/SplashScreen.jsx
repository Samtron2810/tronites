const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-surface text-ink">
      <img
        src="/tronite-logo.png"
        alt="Tronites"
        className="splash-logo h-16 w-auto object-contain"
      />
      <span className="splash-text mt-3 font-display text-4xl font-extrabold tracking-[-0.04em]">
        tronites
      </span>
      <span className="mt-4 h-1.5 w-16 rounded-full bg-accent" />
    </div>
  );
};

export default SplashScreen;
