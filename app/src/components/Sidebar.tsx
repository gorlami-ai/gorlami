import { NavLink } from 'react-router-dom';

export function Sidebar() {
  const menuItems = [
    {
      path: '/',
      label: 'Home',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </svg>
      ),
    },
    {
      path: '/dictionary',
      label: 'Dictionary',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      path: '/activity',
      label: 'Activity',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10,9 9,9 8,9" />
        </svg>
      ),
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5L19 6.5m-14 11L6.5 16M17.5 19.5L19 17.5M6.5 8L5 6.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-70 h-screen bg-gray-50 flex flex-col flex-shrink-0">
      <div className="flex items-center px-5 pt-6 pb-5 mb-2">
        <div className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded-lg text-white mr-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 8v4l3 3" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Gorlami</h2>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-3 py-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium text-gray-700 w-full no-underline ${
                isActive 
                  ? 'bg-gray-200 text-gray-900' 
                  : 'hover:bg-gray-100'
              }`
            }
          >
            <span className="mr-3 w-5 h-5 flex items-center justify-center">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
