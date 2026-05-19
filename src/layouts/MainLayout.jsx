import Navbar from "../components/Navbar";

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-orange-400">
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default MainLayout;
