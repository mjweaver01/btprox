import { NavLink } from 'react-router-dom';

interface MobileSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSlideOut({ isOpen, onClose }: MobileSlideOutProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(320px,85vw)] flex flex-col bg-zinc-900 shadow-2xl ring-1 ring-zinc-700/50 transition-transform duration-300 ease-out md:hidden pt-[env(safe-area-inset-top)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-700/50 px-4 py-3">
          <h2 className="text-lg font-semibold text-zinc-100">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700 touch-manipulation"
            aria-label="Close menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="shrink-0 border-b border-zinc-700/50 px-2 py-3">
          <div className="flex flex-col gap-0.5">
            <NavLink
              to="/"
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors touch-manipulation ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700'
                }`
              }
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                />
              </svg>
              Scanner
            </NavLink>
            <NavLink
              to="/devices"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors touch-manipulation ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700'
                }`
              }
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Devices
            </NavLink>
          </div>
        </nav>

        <div className="min-h-0 flex-1 px-4 py-4 pb-[env(safe-area-inset-bottom)]">
          <p className="text-sm text-zinc-500">
            Click on a device in the Scanner view to track it
          </p>
        </div>
      </aside>
    </>
  );
}
