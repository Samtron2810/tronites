const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen app-bg">
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default MainLayout;
