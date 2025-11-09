# Display Control Feature

This feature allows you to turn your display on/off remotely via the MPV Remote app.

## Features

- **Turn Off Display**: Puts your monitor to sleep while keeping the system running
- **Turn On Display**: Wakes the display remotely without physical interaction

## Requirements

### X11 (Traditional)
- No additional setup required
- Uses `xset` command (standard on all Linux systems)

### Wayland (Modern)
- Requires `ydotool` package for simulating input to wake display
- Requires `ydotoold` daemon to be running
- Requires passwordless sudo configuration

## Installation

### Automatic Setup (Recommended)

Run the installation script:

```bash
cd /path/to/mpv-remote-node
./install-display-control.sh
```

This script will:
1. Check your session type (X11/Wayland)
2. Install ydotool if needed (Wayland only)
3. Create wrapper script for display wake
4. Configure passwordless sudo
5. Start ydotoold daemon
6. Optionally create systemd service for auto-start

### Manual Setup (Wayland)

If you prefer to set up manually:

#### 1. Install ydotool

```bash
# Arch/Manjaro
sudo pacman -S ydotool

# Debian/Ubuntu
sudo apt install ydotool

# Fedora
sudo dnf install ydotool
```

#### 2. Create wrapper script

```bash
sudo tee /usr/local/bin/ydotool-wake << 'EOF'
#!/bin/bash
YDOTOOL_SOCKET=/tmp/.ydotool_socket /usr/bin/ydotool key 42:1 42:0
EOF

sudo chmod +x /usr/local/bin/ydotool-wake
```

#### 3. Configure sudoers

```bash
# For the wrapper script
echo "$USER ALL=(ALL) NOPASSWD: /usr/local/bin/ydotool-wake" | sudo tee /etc/sudoers.d/ydotool-wake
sudo chmod 440 /etc/sudoers.d/ydotool-wake

# For the daemon
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/ydotoold" | sudo tee /etc/sudoers.d/ydotoold
sudo chmod 440 /etc/sudoers.d/ydotoold
```

#### 4. Start ydotoold daemon

```bash
sudo ydotoold
```

To start automatically at boot, create systemd service:

```bash
sudo tee /etc/systemd/system/ydotoold.service << 'EOF'
[Unit]
Description=ydotool daemon
Documentation=https://github.com/ReimuNotMoe/ydotool
After=multi-user.target

[Service]
Type=simple
ExecStart=/usr/bin/ydotoold
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ydotoold
```

## How It Works

### Turn Off Display

**X11**: Uses `xset dpms force off` to immediately turn off the display

**Wayland (KDE)**: Uses KDE's global shortcut system via dbus:
```bash
dbus-send --session --dest=org.kde.kglobalaccel \
  /component/org_kde_powerdevil \
  org.kde.kglobalaccel.Component.invokeShortcut \
  string:'Turn Off Screen'
```

**Wayland (GNOME)**: Uses GNOME ScreenSaver dbus interface

### Turn On Display

**X11**: Uses `xset dpms force on` to wake the display

**Wayland**: Simulates a Shift key press using ydotool to wake the display:
```bash
YDOTOOL_SOCKET=/tmp/.ydotool_socket ydotool key 42:1 42:0
```

The Shift key (keycode 42) is used because it wakes the display without typing any characters.

## Troubleshooting

### Display won't turn on (Wayland)

1. Check if ydotoold is running:
   ```bash
   pgrep ydotoold
   ```

2. Check MPV output for errors when starting

3. Test the wrapper script manually:
   ```bash
   sudo /usr/local/bin/ydotool-wake
   ```

4. Verify socket permissions:
   ```bash
   ls -l /tmp/.ydotool_socket
   ```

### "Permission denied" errors

Make sure sudoers is configured correctly:
```bash
sudo visudo -c
```

### Display turns back on immediately after turning off

This can happen if there's input device activity. The turn off command includes a 1-second delay to avoid this.

## Security Considerations

This feature requires passwordless sudo for specific commands:
- `/usr/local/bin/ydotool-wake` - Only simulates a Shift key press
- `/usr/bin/ydotoold` - Only the ydotool daemon

These are limited, specific commands that don't pose significant security risks. The wrapper script ensures only the intended action (waking the display) can be performed.

## Platform Support

| Platform | Turn Off | Turn On | Notes |
|----------|----------|---------|-------|
| Linux X11 | ✅ | ✅ | Built-in support |
| Linux Wayland (KDE) | ✅ | ✅ | Requires ydotool |
| Linux Wayland (GNOME) | ✅ | ✅ | Requires ydotool |
| Windows | ❌ | ❌ | Not yet implemented |
| macOS | ❌ | ❌ | Not yet implemented |

## Contributing

Pull requests are welcome to add support for other desktop environments and platforms!
