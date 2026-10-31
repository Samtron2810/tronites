import cx from "../utils/cx";

// Page frame. By default a centred single column (max-w-3xl), exactly as
// before. Pass `rail` to add a sticky right rail (xl+ only — callers should
// mount the rail node only when it will be visible, see useMediaQuery).
// The left sidebar / bottom bar offset comes from `.app-shell` in App.jsx.
const MainLayout = ({ children, rail = null }) => {
  return (
    <div className="min-h-screen app-bg">
      <div
        className={cx(
          "mx-auto flex w-full items-start",
          rail ? "max-w-[1060px]" : "max-w-3xl",
        )}
      >
        <main
          className={cx(
            "min-w-0 flex-1 px-4 py-6",
            rail && "sm:px-6 xl:max-w-[720px]",
          )}
        >
          {children}
        </main>
        {rail && (
          <aside
            aria-label="Sidebar"
            className="sticky top-0 hidden h-dvh w-[340px] shrink-0 overflow-y-auto border-l-2 border-line px-6 py-6 xl:block"
          >
            {rail}
          </aside>
        )}
      </div>
    </div>
  );
};

export default MainLayout;
