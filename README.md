# TPN Connect

A simple and elegant command-line tool for connecting to TPN (The Peoples Network) decentralized VPN service.

![TPN Connect Banner](https://via.placeholder.com/800x200?text=TPN+Connect)

## Features

- **Simple Interface**: Easy-to-use command-line interface
- **Validator Selection**: Choose from multiple TPN validators
- **Regional Routing**: Select exit regions for your VPN connection
- **Connection Timer**: Automatically disconnect after a specified time
- **Progress Display**: Real-time connection status and time remaining
- **Command Line Options**: Run in interactive or non-interactive mode

## Installation

### Prerequisites

- Node.js v16 or higher
- WireGuard (will be installed automatically if not present)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/ENZOMOTIVE/tpn-connect.git
cd tpn-connect

# Run the installation script
chmod +x install.sh
./install.sh
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tpn-connect.git
cd tpn-connect

# Install dependencies
npm install

# Make the script executable
chmod +x index.js

# Optional: Install globally
npm install -g .
```

## Usage

### Interactive Mode

Simply run the command without any options to use the interactive mode:

```bash
tpn-connect
```

You'll be guided through:
1. Selecting a TPN validator
2. Choosing an exit region
3. Setting the connection time

### Command Line Options

```bash
# Connect using specific options
tpn-connect --validator 4 --region EU --time 60

# Available options
tpn-connect --help
```

Options:
- `-v, --validator <uid>`: Specify validator UID
- `-r, --region <region>`: Specify exit region (US, EU, ASIA)
- `-t, --time <minutes>`: Specify connection time in minutes
- `-q, --quiet`: Run in quiet mode with minimal output

### Examples

```bash
# Connect to a US region for 30 minutes
tpn-connect -r US -t 30

# Connect to a European validator in quiet mode
tpn-connect -v 4 -q

# Connect to Asia for 2 hours
tpn-connect -r ASIA -t 120
```

## How It Works

TPN Connect provides a seamless interface to the TPN decentralized VPN network:

1. **Connection Setup**: Communicates with a TPN validator to establish VPN parameters
2. **WireGuard Configuration**: Automatically generates and applies WireGuard configuration
3. **IP Management**: Handles the routing of your traffic through the selected exit region
4. **Connection Monitoring**: Tracks connection time and gracefully disconnects when complete

## Development

### Project Structure

```
tpn-connect/
├── index.js        # Main application script
├── validators.json # Validator information
├── install.sh      # Installation script
├── package.json    # Project configuration
└── README.md       # Documentation
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Peoples Network (TPN) for creating a decentralized VPN infrastructure
- WireGuard for providing the underlying VPN technology
- The open-source community for the amazing tools used in this project