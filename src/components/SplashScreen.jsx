import logo from "../assets/tronite-logo.png";

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-primary-900">
      <img
        src={logo}
        alt="Tronites"
        className="splash-logo h-16 w-auto object-contain"
      />
      <span className="splash-text mt-4 text-white font-bold text-2xl tracking-tight">
        Tron<span className="text-primary-200">ites</span>
      </span>
    </div>
  );
};

export default SplashScreen;
