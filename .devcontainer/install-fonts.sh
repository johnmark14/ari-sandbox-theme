#!/bin/bash

# Auto-install JetBrains Mono font on macOS
# Run this once on each new Mac: ./.devcontainer/install-fonts.sh

set -e

FONT_NAME="JetBrainsMono Nerd Font"
FONT_VERSION="3.1.1"
FONT_URL="https://github.com/ryanoasis/nerd-fonts/releases/download/v${FONT_VERSION}/JetBrainsMono.zip"
FONT_DIR="$HOME/Library/Fonts"
TEMP_DIR="/tmp/jetbrains-mono-install"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== JetBrainsMono Nerd Font Installer ===${NC}\n"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}This script is for macOS only${NC}"
    exit 1
fi

# Check if font already installed
if ls "$FONT_DIR"/*JetBrainsMono* 1> /dev/null 2>&1; then
    echo -e "${GREEN}✓ JetBrainsMono Nerd Font is already installed${NC}"
    echo ""
    echo "Installed variants:"
    ls -1 "$FONT_DIR" | grep JetBrainsMono | head -5
    echo ""
    echo "To reinstall, remove old fonts first:"
    echo "  rm ~/Library/Fonts/*JetBrainsMono*"
    exit 0
fi

# Create temp directory
echo "Creating temporary directory..."
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Download font
echo -e "${BLUE}Downloading JetBrainsMono Nerd Font v${FONT_VERSION}...${NC}"
if command -v curl &> /dev/null; then
    curl -L -o jetbrains-mono.zip "$FONT_URL"
elif command -v wget &> /dev/null; then
    wget -O jetbrains-mono.zip "$FONT_URL"
else
    echo -e "${YELLOW}Error: curl or wget required${NC}"
    exit 1
fi

# Extract
echo "Extracting fonts..."
unzip -q jetbrains-mono.zip

# Install TTF fonts
echo "Installing fonts to $FONT_DIR..."
if [ -d "fonts/ttf" ]; then
    cp fonts/ttf/*.ttf "$FONT_DIR/"
elif [ -d "ttf" ]; then
    cp ttf/*.ttf "$FONT_DIR/"
else
    echo -e "${YELLOW}Warning: TTF directory not found, trying all TTF files...${NC}"
    find . -name "*.ttf" -exec cp {} "$FONT_DIR/" \;
fi

# Cleanup
echo "Cleaning up..."
cd ~
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✓ JetBrainsMono Nerd Font installed successfully!${NC}"
echo ""
echo "Installed fonts:"
ls -1 "$FONT_DIR" | grep JetBrainsMono | head -5
echo ""
echo "Restart VSCode to use the new font."
echo "The dev container is already configured to use JetBrainsMono Nerd Font Mono."
