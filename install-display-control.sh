#!/bin/bash

# Installation script for display control feature (Wayland support)
# This script sets up ydotool for turning the display on/off remotely

set -e

echo "================================"
echo "MPV Remote - Display Control Setup"
echo "================================"
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "This script is only for Linux systems."
    exit 1
fi

# Detect session type
SESSION_TYPE="${XDG_SESSION_TYPE:-}"
echo "Detected session type: ${SESSION_TYPE:-unknown}"

# Check if Wayland
if [[ "$SESSION_TYPE" == "wayland" ]]; then
    echo ""
    echo "Wayland detected. Setting up ydotool for display wake functionality..."
    echo ""

    # Check if ydotool is installed
    if ! command -v ydotool &> /dev/null; then
        echo "ydotool is not installed."
        echo ""
        echo "Please install ydotool using your package manager:"
        echo "  Arch/Manjaro:  sudo pacman -S ydotool"
        echo "  Debian/Ubuntu: sudo apt install ydotool"
        echo "  Fedora:        sudo dnf install ydotool"
        echo ""
        read -p "Would you like to try installing with pacman? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo pacman -S --noconfirm ydotool || {
                echo "Failed to install ydotool. Please install it manually."
                exit 1
            }
        else
            echo "Please install ydotool and run this script again."
            exit 1
        fi
    else
        echo "✓ ydotool is already installed"
    fi

    # Create wrapper script
    echo ""
    echo "Creating ydotool wrapper script..."
    sudo tee /usr/local/bin/ydotool-wake > /dev/null << 'EOF'
#!/bin/bash
YDOTOOL_SOCKET=/tmp/.ydotool_socket /usr/bin/ydotool key 42:1 42:0
EOF
    sudo chmod +x /usr/local/bin/ydotool-wake
    echo "✓ Wrapper script created at /usr/local/bin/ydotool-wake"

    # Configure sudoers for ydotool wrapper
    echo ""
    echo "Configuring passwordless sudo for ydotool-wake..."
    echo "$USER ALL=(ALL) NOPASSWD: /usr/local/bin/ydotool-wake" | sudo tee /etc/sudoers.d/ydotool-wake > /dev/null
    sudo chmod 440 /etc/sudoers.d/ydotool-wake
    echo "✓ Sudoers configured"

    # Configure sudoers for ydotoold daemon
    echo ""
    echo "Configuring passwordless sudo for ydotoold daemon..."
    echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/ydotoold" | sudo tee /etc/sudoers.d/ydotoold > /dev/null
    sudo chmod 440 /etc/sudoers.d/ydotoold
    echo "✓ Sudoers configured for daemon"

    # Check if ydotoold is running
    echo ""
    if pgrep ydotoold > /dev/null; then
        echo "✓ ydotoold daemon is already running"
    else
        echo "Starting ydotoold daemon..."
        sudo ydotoold &
        sleep 1
        if pgrep ydotoold > /dev/null; then
            echo "✓ ydotoold daemon started successfully"
        else
            echo "⚠ Failed to start ydotoold daemon"
            echo "  You may need to start it manually: sudo ydotoold"
        fi
    fi

    # Offer to create systemd service
    echo ""
    read -p "Would you like to create a systemd service to start ydotoold automatically at boot? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating systemd service..."
        sudo tee /etc/systemd/system/ydotoold.service > /dev/null << 'EOF'
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
        sudo systemctl enable ydotoold
        sudo systemctl start ydotoold
        echo "✓ Systemd service created and enabled"
    fi

    echo ""
    echo "================================"
    echo "✓ Wayland display control setup complete!"
    echo "================================"
    echo ""
    echo "Display control features are now available:"
    echo "  - Turn Off Display: Works via KDE global shortcut"
    echo "  - Turn On Display: Simulates key press via ydotool"
    echo ""

elif [[ "$SESSION_TYPE" == "x11" ]]; then
    echo ""
    echo "X11 detected. Display control should work out of the box using xset."
    echo "No additional setup required."
    echo ""

else
    echo ""
    echo "Could not detect session type."
    echo "Display control may require manual configuration."
    echo ""
fi

echo "Setup complete!"
