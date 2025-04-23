#!/usr/bin/env bash

# TPN Connect installation script

# Print colored messages
print_info() {
  echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
  echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
  echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
  echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_info "Installing TPN Connect..."

# Check for Node.js
if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed. Please install Node.js version 16 or higher."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)
if [ $NODE_MAJOR -lt 16 ]; then
  print_error "Node.js version 16 or higher is required. Found version $NODE_VERSION"
  exit 1
fi

# Check for WireGuard
if ! command -v wg &> /dev/null; then
  print_warning "WireGuard is not installed. Attempting to install it now..."
  
  # Detect OS
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v apt &> /dev/null; then
      print_info "Installing WireGuard on Debian/Ubuntu..."
      sudo apt update && sudo apt install -y wireguard-tools
    elif command -v dnf &> /dev/null; then
      print_info "Installing WireGuard on Fedora/RHEL..."
      sudo dnf install -y wireguard-tools
    elif command -v pacman &> /dev/null; then
      print_info "Installing WireGuard on Arch Linux..."
      sudo pacman -S --noconfirm wireguard-tools
    else
      print_error "Unable to determine package manager. Please install WireGuard manually."
      exit 1
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if command -v brew &> /dev/null; then
      print_info "Installing WireGuard on macOS..."
      brew install wireguard-tools
    else
      print_error "Homebrew not found. Please install WireGuard manually."
      exit 1
    fi
  else
    print_error "Unsupported operating system. Please install WireGuard manually."
    exit 1
  fi
  
  # Check if installation was successful
  if ! command -v wg &> /dev/null; then
    print_error "Failed to install WireGuard. Please install it manually."
    exit 1
  else
    print_success "WireGuard installed successfully!"
  fi
else
  print_success "WireGuard is already installed!"
fi

# Install npm dependencies
print_info "Installing npm dependencies..."
npm install

# Make script executable
chmod +x index.js

# Install globally (optional)
read -p "Do you want to install TPN Connect globally? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  print_info "Installing TPN Connect globally..."
  npm install -g .
  print_success "TPN Connect installed globally! You can now run it with 'tpn-connect' from anywhere."
else
  print_success "TPN Connect installed locally! You can run it with 'npm start' or 'node index.js'."
fi

print_success "Installation complete! Enjoy your secure and private VPN connection."