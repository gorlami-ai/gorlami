import { NavLink } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { 
  HomeIcon, 
  DictionaryIcon, 
  ActivityIcon, 
  SettingsIcon,
  GorlamiLogoIcon 
} from '../assets/icons';

export function Sidebar() {
  const menuItems = [
    {
      path: '/',
      label: 'Home',
      icon: <HomeIcon />,
    },
    {
      path: '/dictionary',
      label: 'Dictionary',
      icon: <DictionaryIcon />,
    },
    {
      path: '/activity',
      label: 'Activity',
      icon: <ActivityIcon />,
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <SettingsIcon />,
    },
  ];

  return (
    <div className="w-70 h-screen bg-gray-50 flex flex-col flex-shrink-0">
      <div className="flex items-center px-5 pt-6 pb-5 mb-2">
        <div className="w-8 h-8 flex items-center justify-center bg-blue-500 rounded-lg text-white mr-3">
          <GorlamiLogoIcon width={16} height={16} />
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

      {/* User Section */}
      <div className="mt-auto border-t border-gray-200">
        <UserMenu />
      </div>
    </div>
  );
}
