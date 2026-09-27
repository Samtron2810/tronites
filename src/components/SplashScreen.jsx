const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-[#04342c]">
      <img
        src="/tronite-logo.png"
        alt="Tronites"
        className="splash-logo h-16 w-auto object-contain"
      />
      <span className="splash-text mt-4 text-white font-bold text-3xl tracking-tight">
        Tron<span className="text-[#9fe1cb]">ites</span>
      </span>
    </div>
  );
};

export default SplashScreen;
