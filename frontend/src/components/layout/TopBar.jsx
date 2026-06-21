import { Menu, Bell, Moon, Sun, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import { useNotificationContext } from "../../context/NotificationContext";
import { Avatar } from "../ui/Avatar";
import { Dropdown, DropdownItem } from "../ui/Dropdown";

export function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotificationContext();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-gray-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-500" />
          )}
        </button>

        <Dropdown
          trigger={
            <div className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </div>
          }
          align="right"
        >
          <div className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            Notifications
          </div>
          {unreadCount === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No new notifications</div>
          ) : (
            <DropdownItem onClick={() => window.location.href = "/notifications"}>
              View all notifications
            </DropdownItem>
          )}
        </Dropdown>

        <Dropdown
          trigger={
            <div className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <Avatar src={user?.profile_picture} name={user?.name} size="sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                {user?.name}
              </span>
            </div>
          }
          align="right"
        >
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <DropdownItem onClick={() => window.location.href = "/settings"}>
            Settings
          </DropdownItem>
          <DropdownItem onClick={logout} danger>
            <LogOut className="w-4 h-4 inline mr-2" />
            Logout
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
