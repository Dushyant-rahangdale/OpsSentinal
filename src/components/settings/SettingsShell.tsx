type Props = {
  isAdmin: boolean;
  isResponderOrAbove: boolean;
  children: React.ReactNode;
};

export default function SettingsShell({
  isAdmin: _isAdmin,
  isResponderOrAbove: _isResponderOrAbove,
  children,
}: Props) {
  return (
    <div className="settings-shell-v2 settings-shell-single">
      <main className="settings-main-v2">{children}</main>
    </div>
  );
}
