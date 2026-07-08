# 🌐 Digital Nomad Security Suite

An Enhanced Command-Line Tool for Safe, Seamless VPN Connections Anywhere in the World.

> Formerly **TPN Connect**, this upgraded tool now includes automatic security checks, location-based risk assessment, emergency disconnect (panic button), and real-time statistics — all tailored for digital nomads and privacy-conscious users.

---

![image](https://github.com/user-attachments/assets/2c25fd1f-e020-4cd1-8cf9-7901aa55d028)

## 🚀 Features

### ✅ VPN Essentials (Inherited from TPN Connect)
- **Simple CLI Interface** – Seamless VPN setup in terminal.
- **Validator Selection** – Choose from available TPN validators.
- **Regional Routing** – Pick an exit region (US, EU, ASIA).
- **Connection Timer** – Set time-based session duration.
- **Quiet Mode** – Run with minimal output for scripting.
- **Auto WireGuard Config** – Installs & configures WireGuard automatically.

### 🔐 Security-Focused Additions
- **📶 Automatic Wi-Fi Security Detection**  
  Detects and warns about unsecured/public networks.

- **📍 Location-Based Risk Assessment**  
  Uses IP geolocation to assess regional risks.

- **🛑 Panic Button**  
  Instantly disconnect from the network in case of threats.

- **📊 Usage & Risk Statistics**  
  Tracks locations visited and potential risks encountered.

- **📺 Terminal Dashboard**  
  Interactive interface with live connection, status, and keybindings.

---

## 🎯 Use Cases
Perfect for:
- 🌍 Digital Nomads  
- 💼 Remote Workers  
- 🧑‍💻 Privacy Advocates  
- ✈️ Frequent Travelers  

---

## 📦 Installation

### 🔧 Prerequisites
- Node.js v16 or higher
- WireGuard

### 🚀 Quick Setup

```bash
git clone https://github.com/ENZOMOTIVE/tpn-connect.git
cd tpn-connect

# Install dependencies
npm install

# Make script executable
chmod +x index.js

# Optional: Install globally
npm install -g .
```

### 🧠 How it Works
- Connects to TPN (The People’s Network) validator

- Configures secure tunnel via WireGuard

- Detects and analyzes current network and location

- Provides intelligent insights and secure connection monitoring

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- The Peoples Network (TPN) for creating a decentralized VPN infrastructure
- WireGuard for providing the underlying VPN technology
- The open-source community for the amazing tools used in this project

## Project Metadata

| Field | Details |
| --- | --- |
| Repository | `ENZOMOTIVE/tpn-connect` |
| Categories | `General` |
| Primary stack | Node.js, JavaScript |

