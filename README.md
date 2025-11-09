MPV Remote 2 Node, is an enhanced and updated nodejs application for controlling MPV media player remotely running on your PC, based on the original [MPV Remote Node](https://github.com/husudosu/mpv-remote-node) by [@husudosu](https://github.com/husudosu/), Ferenc Nánási 

# MPV Remote 2, Node server
<p align="center">
<img src="https://github.com/ilivetruth/mpv-remote-2/blob/main/images/icon.png?raw=true" >
</p>

# New Features

- **Playlist management** - Save, load, and manage multiple playlists. Create playlists from current queue or from file browser,
- **Favorites** - Star your favorite videos and songs, then filter to show only favorites in file browser,
- **Multi-select in file browser** - Long-press to select multiple files and add them to queue or playlists at once,
- **Enlarged Playback Buttons** - Increased size of the icons to use all available width,
- **Added File manager Page** - to main drawer for easier access.
- **Display Control** - Turn off/on monitor/display on wayland, x11 and windows.

- # Display Control Feature

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



MPV remote control API. You can use [MPV Remote 2](https://github.com/ilivetruth/mpv-remote-2) or the original [MPV Remote android application](https://github.com/husudosu/mpv-remote-app/releases/latest) by [@husudosu](https://github.com/husudosu/), Ferenc Nánási, or you can create your own frontend.

[API documentation accessible here.](https://github.com/husudosu/mpv-remote-node/blob/master/APIDESIGN.md)

# Installation

### Requirements:

- [Node.JS](https://nodejs.org/en/) (use [13.14.0 LTS](https://nodejs.org/download/release/v13.14.0/) for Windows 7)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) or [youtube-dl](https://youtube-dl.org/) for playing youtube videos,

### Install package

**Linux:**

Open your favorite terminal and:

```bash
sudo npm install -g mpv-remote
mpv-remote # Follow instructions
```

**Windows:**
Open powershell as admin. It's required only for creating symbolic links.

```powershell
Set-ExecutionPolicy Unrestricted -Force # Allows running PS scripts from unknown sources
npm install -g mpv-remote
mpv-remote # Follow instructions
```

## Update

You have to re-run installation script after updating the package.

```bash
npm update -g mpv-remote
mpv-remote # Follow instructions
```

Note: if you get "Cannot create symbolic link because the path already exists" don't worry the installation will be fine.

# How to run MPV

If you don't want MPV close after playback finished use --idle flag or you can add `idle=yes` to your mpv.conf.

```
mpv --idle
```

# Configuration variables

You can configure server by using `--script-opts` flag of MPV like this (options seperated by ,):

```
mpv --script-opts=mpvremote-filebrowserpaths=/home/sudosu,mpvremote-uselocaldb=0
```

Or you can use a script-opts file.

scipt-opts location for mpvremote:

```bash
%appdata%/mpv/script-opts/mpvremote.conf # For windows
~/.config/mpv/script-opts/mpvremote.conf # For linux
```

If using script-opts file, you don't need `mpvremote-` prefix at configuration options.

[More info about script-opts files.](https://mpv.io/manual/master/#configuration)

Example configuration file:

```
# ~/.config/mpv/script-opts/mpvremote.conf
uselocaldb=1
webport=8000
webportrangeend=8010
unsafefilebrowsing=1
filebrowserpaths="'V:\anime';'W:\anime';'W:\Steins;Gate'"
verbose=0
osd-messages=1
```

## Available options:

| Option name                  | Description                                                                                                                                                                                                                           | Default value       | Available options/example                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------- |
| mpvremote-uselocaldb         | Use local database to store media statuses and collections.                                                                                                                                                                           | 1                   | 0 - Disabled <br /> 1 - Enabled          |
| mpvremote-filebrowserpaths   | Stores paths which can be browsable by users it's a semicolon seperated list                                                                                                                                                          | N/A                 | "'V:\anime';'W:\anime';'W:\Steins;Gate'" |
| mpvremote-webport            | This option gonna be your first available port for MPV.                                                                                                                                                                               | 8000                | Any port within correct range            |
| mpvremote-webportrangeend    | Web port range end. if mpvremote-webport is 8000 and this option set to 8004, 5 instances of MPV gonna be supported. Increase/decrease these numbers as you wish.                                                                     | 8004                | Any port within correct range            |
| mpvreomte-address            | Server address                                                                                                                                                                                                                        | Your first local IP | 127.0.0.1                                |
| mpvremote-unsafefilebrowsing | Allows you to browse your local filesystem. Be careful though, exposing your whole filesystem not the safest option. For security reasons filebrowser only send results of media files, playlists, subtitle files and subdirectories. | 1                   | 0 - Disabled<br/> 1 - Enabled            |
| mpvremote-verbose            | Verbose logging of MPV socket                                                                                                                                                                                                         | 0                   | 0 - Disabled<br/> 1 - Enabled            |
| mpvremote-osd-messages       | Show OSD messages on the player created by this plugin                                                                                                                                                                                | 1                   | 0 - Disabled<br> 1 - Enabled             |

# Troubleshooting

## NPM install/update takes forever

Sometimes NPM takes forever to install a package, [it's a known bug](https://github.com/npm/cli/issues/3359), try update NPM to the latest version and hope it's going to work. Run this as administrator:

```
npm install -g npm@latest
```

## Server not starting

If the server not starts, try run it manually, to get the exception (From terminal/command prompt):

```bash
node ~/.config/mpv/scripts/mpvremote/remoteServer.js # On linux systems
node %APPDATA%/mpv/scripts/mpvremote/remoteServer.js # On Windows from command prompt.
```

If you report server non starting issue copy the output of this command.

If you get "No socket provided" output the server works fine, so there's something up with the plugin or MPV itself.

## Youtube playback issues

I recommend using [yt-dlp](https://github.com/yt-dlp/yt-dlp) for playing Youtube videos, but if you use youtube-dl:

- If you can't play Youtube videos then try to update the **youtube-dl** package (as admin): `pip3 install --upgrade youtube-dl`

## Common issues on Linux

yargs requires 12 or newer version of Node.JS so you should update your Node.JS version. For example this error occours on Ubuntu 20.04.3 LTS.

- [How to update Node.JS](https://askubuntu.com/questions/426750/how-can-i-update-my-nodejs-to-the-latest-version)

If the server works fine, then there's an issue with MPV itself. Some linux distributions like Debian and MX Linux ships pre-built MPV packages without Javascript support.

You can check it by using this command:

```bash
mpv -v | grep javascript
```

if the output is empty, there's no javascript support.

Install mujs and [build MPV for yourself](https://github.com/mpv-player/mpv-build)

## When you report an issue

It makes problem solving easier if you provide some info about your environment.

- Your OS,
- Node.JS version (`node -v`)
- NPM version (`npm -v`)
- MPV version (`mpv -v`)

# TODO

- Need better installation scripts for Windows and Linux, where update can be handled easily. (NPM postinstall script maybe)
- Improve API documentation,
- Better installation scripts,
- Make a Youtube video about installing/updating MPV-remote on Windows and Linux

# Disclaimer

The app developer DOES NOT promotes piracy! Other apps and modules used by this app may include some level of piracy.
