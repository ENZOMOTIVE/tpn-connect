#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const boxen = require('boxen');
const ora = require('ora');
const axios = require('axios');
const { execaCommand } = require('execa');
const fs = require('fs');
const os = require('os');
const cliProgress = require('cli-progress');
const path = require('path');
const wifi = require('node-wifi');
const geoip = require('geoip-lite');
const termKit = require('terminal-kit').terminal;
const { EventEmitter } = require('events');


// Initialize event system
const securityEvents = new EventEmitter();

// Initialize wifi module
wifi.init({
  iface: null // Use default WiFi interface
});

// Security risk levels
const RISK_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  SAFE: 'SAFE'
};

// Known secure networks - in real app, would be stored in a config file
const KNOWN_NETWORKS = [
  'MyHomeNetwork',
  'MyWorkNetwork'
];

// High-risk countries - simplified list for demo
const HIGH_RISK_COUNTRIES = [
  'CN', 'RU', 'IR', 'SA', 'VN', 'CU'
];

// Connection stats
let connectionStats = {
  totalConnections: 0,
  totalTime: 0,
  countriesVisited: new Set(),
  dataSaved: {} // Will track how much potentially sensitive data was protected
};

// Function to check WiFi security
async function checkWifiSecurity() {
  try {
    const networks = await wifi.scan();
    const currentConnections = await wifi.getCurrentConnections();
    
    if (currentConnections.length === 0) {
      return { risk: RISK_LEVELS.MEDIUM, reason: 'Not connected to WiFi' };
    }
    
    const currentNetwork = currentConnections[0];
    
    // Check if it's a known network
    if (KNOWN_NETWORKS.includes(currentNetwork.ssid)) {
      return { risk: RISK_LEVELS.SAFE, reason: 'Connected to known network' };
    }
    
    // Check if it's open (no security)
    if (!currentNetwork.security || currentNetwork.security === 'Open') {
      return { risk: RISK_LEVELS.HIGH, reason: 'Connected to unsecured network' };
    }
    
    // Check if it's a public hotspot (common names)
    if (/public|hotel|airport|cafe|free|guest/i.test(currentNetwork.ssid)) {
      return { risk: RISK_LEVELS.MEDIUM, reason: 'Connected to public network' };
    }
    
    return { risk: RISK_LEVELS.LOW, reason: 'Connected to secured network' };
  } catch (error) {
    console.error('Failed to check WiFi security:', error.message);
    return { risk: RISK_LEVELS.MEDIUM, reason: 'Unable to determine network security' };
  }
}

// Function to check location security based on IP
async function checkLocationSecurity(ip) {
  try {
    const geo = geoip.lookup(ip);
    
    if (!geo) {
      return { risk: RISK_LEVELS.MEDIUM, reason: 'Unable to determine location' };
    }
    
    if (HIGH_RISK_COUNTRIES.includes(geo.country)) {
      return { 
        risk: RISK_LEVELS.HIGH, 
        reason: `Located in high-risk country: ${geo.country}`,
        location: geo
      };
    }
    
    return { 
      risk: RISK_LEVELS.LOW, 
      reason: 'Located in standard-risk country',
      location: geo
    };
  } catch (error) {
    console.error('Failed to check location security:', error.message);
    return { risk: RISK_LEVELS.MEDIUM, reason: 'Unable to determine location security' };
  }
}

// Function to display security dashboard
function showSecurityDashboard(wifiSecurity, locationSecurity, isConnected) {
  termKit.clear();
  
  // Display header
  termKit.bold.cyan('\n╔═══════════════════════════════════════════════════════════╗\n');
  termKit.bold.cyan('║                DIGITAL NOMAD SECURITY SUITE                ║\n');
  termKit.bold.cyan('╚═══════════════════════════════════════════════════════════╝\n\n');
  
  // Display connection status
  if (isConnected) {
    termKit.green('■ ').bold('VPN STATUS: ').green('CONNECTED\n\n');
  } else {
    termKit.red('■ ').bold('VPN STATUS: ').red('DISCONNECTED\n\n');
  }
  
  // Display WiFi security
  termKit.bold('▸ WiFi Security: ');
  switch(wifiSecurity.risk) {
    case RISK_LEVELS.HIGH:
      termKit.red(`${wifiSecurity.risk} - ${wifiSecurity.reason}\n`);
      break;
    case RISK_LEVELS.MEDIUM:
      termKit.yellow(`${wifiSecurity.risk} - ${wifiSecurity.reason}\n`);
      break;
    case RISK_LEVELS.LOW:
      termKit.green(`${wifiSecurity.risk} - ${wifiSecurity.reason}\n`);
      break;
    case RISK_LEVELS.SAFE:
      termKit.brightGreen(`${wifiSecurity.risk} - ${wifiSecurity.reason}\n`);
      break;
  }
  
  // Display location security
  termKit.bold('▸ Location Security: ');
  switch(locationSecurity.risk) {
    case RISK_LEVELS.HIGH:
      termKit.red(`${locationSecurity.risk} - ${locationSecurity.reason}\n`);
      break;
    case RISK_LEVELS.MEDIUM:
      termKit.yellow(`${locationSecurity.risk} - ${locationSecurity.reason}\n`);
      break;
    case RISK_LEVELS.LOW:
    case RISK_LEVELS.SAFE:
      termKit.green(`${locationSecurity.risk} - ${locationSecurity.reason}\n`);
      break;
  }
  
  if (locationSecurity.location) {
    termKit(`  Location: ${locationSecurity.location.country}, ${locationSecurity.location.city}\n`);
  }
  
  // Display usage stats
  termKit.bold('\n▸ Security Statistics:\n');
  termKit(`  Total protected connections: ${connectionStats.totalConnections}\n`);
  termKit(`  Total protected time: ${Math.round(connectionStats.totalTime / 60)} minutes\n`);
  termKit(`  Countries visited: ${Array.from(connectionStats.countriesVisited).join(', ') || 'None'}\n\n`);
  
  // Display quick commands
  termKit.bold('▸ Quick Commands:\n');
  termKit.cyan('  [C] Connect    ');
  termKit.yellow('[D] Disconnect    ');
  termKit.red('[P] Panic Button    ');
  termKit.blue('[R] Refresh    ');
  termKit.gray('[Q] Quit\n\n');
}

// Function to implement panic button - quickly disconnect and clear data
async function panicButtonAction(cfgPath) {
  const panicSpinner = ora('‼️ PANIC BUTTON ACTIVATED - Disconnecting and securing...').start();
  
  try {
    // Disconnect VPN
    await execaCommand(`wg-quick down ${cfgPath}`);
    
    // Clear DNS cache
    if (os.platform() === 'darwin') {
      await execaCommand('sudo killall -HUP mDNSResponder');
    } else if (os.platform() === 'linux') {
      await execaCommand('sudo systemd-resolve --flush-caches');
    }
    
    // Clear browser cache (this would be more sophisticated in a real app)
    console.log('Consider clearing your browser cache manually');
    
    panicSpinner.succeed(chalk.green('✅ Panic mode completed - Connection terminated securely'));
  } catch (error) {
    panicSpinner.fail(chalk.red(`Failed during panic sequence: ${error.message}`));
  }
}

// Function to safely connect to VPN (ensures cleanup of existing connections)
async function safeConnect(cfgPath) {
  try {
    // First try to bring down any existing connection (ignore errors)
    try {
      await execaCommand(`wg-quick down ${cfgPath}`);
      console.log(chalk.gray("Cleaned up existing connection"));
    } catch (e) {
      // Ignore errors if the connection doesn't exist
      if (e.stderr && e.stderr.includes("is not a WireGuard interface")) {
        console.log(chalk.gray("No existing connection to clean up"));
      } else {
        console.log(chalk.gray(`Cleanup error (continuing anyway): ${e.message}`));
      }
    }
    
    // Now start a new connection
    await execaCommand(`wg-quick up ${cfgPath}`);
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to start WireGuard: ${error.message}`));
    return false;
  }
}

// Load validators from JSON file
let validators;
try {
  const validatorsPath = path.join(__dirname, 'validators.json');
  validators = JSON.parse(fs.readFileSync(validatorsPath, 'utf8'));
} catch (error) {
  console.error(chalk.red('Failed to load validators.json:'), error.message);
  console.log(chalk.yellow('Make sure validators.json exists in the same directory as index.js'));
  process.exit(1);
}

// Debug information
console.log(chalk.blue('Debug: Starting TPN Connect...'));
console.log(chalk.blue(`Debug: Found ${validators.length} validators`));

// Helper function to get public IP
async function getPublicIP() {
  try {
    const res = await axios.get('https://api.ipify.org?format=json');
    return res.data.ip;
  } catch (error) {
    console.error('Could not fetch public IP:', error.message);
    return 'unknown';
  }
}

// Check if WireGuard is installed
async function checkWireGuard() {
  try {
    await execaCommand('which wg');
    return true;
  } catch (error) {
    return false;
  }
}

// Install WireGuard if needed
async function installWireGuard() {
  console.log(chalk.yellow('⚠ WireGuard not found. Installing...'));
  const platform = os.platform();
  
  try {
    if (platform === 'linux') {
      await execaCommand('sudo apt update && sudo apt install -y wireguard-tools');
    } else if (platform === 'darwin') {
      await execaCommand('brew install wireguard-tools');
    } else {
      throw new Error('Unsupported OS');
    }
    console.log(chalk.green('✅ WireGuard installed successfully!'));
  } catch (error) {
    console.error(chalk.red(`Failed to install WireGuard: ${error.message}`));
    console.log(chalk.yellow('Please install WireGuard manually and try again.'));
    process.exit(1);
  }
}

// Main function
async function main() {
  // Display banner
  console.log(gradient.pastel.multiline(figlet.textSync('TPN Connect', { horizontalLayout: 'full' })));
  console.log(chalk.cyan('🔒 Simple and Secure Decentralized VPN Connection\n'));
  
  // Check WireGuard installation
  if (!await checkWireGuard()) {
    await installWireGuard();
  }
  
  // Create command line interface
  const program = new Command();
  program
    .name('tpn-connect')
    .description('Simple CLI tool to connect to TPN VPN')
    .option('-v, --validator <uid>', 'Validator UID')
    .option('-r, --region <region>', 'Exit region (US, EU, ASIA)')
    .option('-t, --time <minutes>', 'Connection time in minutes')
    .option('-q, --quiet', 'Run in quiet mode with minimal output')
    .option('-d, --debug', 'Show debug information')
    .parse(process.argv);
  
  const options = program.opts();
  const quietMode = options.quiet;
  const debugMode = options.debug;
  
  if (debugMode) {
    console.log(chalk.blue('Debug: Command line options:'), options);
  }
  
  // Select validator
  let selectedValidator;
  if (options.validator) {
    selectedValidator = validators.find(v => v.UID === options.validator);
    if (!selectedValidator) {
      console.error(chalk.red(`Validator UID "${options.validator}" not found!`));
      process.exit(1);
    }
  } else {
    if (!quietMode) {
      const { validator } = await inquirer.prompt([{
        type: 'list',
        name: 'validator',
        message: 'Select a TPN validator:',
        choices: validators.map(v => ({
          name: `UID ${v.UID} - ${v.Axon} (${v.Location})`,
          value: v
        }))
      }]);
      selectedValidator = validator;
    } else {
      // In quiet mode, choose a random validator
      selectedValidator = validators[Math.floor(Math.random() * validators.length)];
    }
  }
  
  console.log(chalk.gray(`🌐 Using validator: ${selectedValidator.Axon} (${selectedValidator.Location})`));
  
  // Get available regions from validator
  const spinner = ora('Fetching available regions...').start();
  let availableRegions;
  
  try {
    if (debugMode) {
      console.log(chalk.blue(`Debug: Fetching regions from http://${selectedValidator.Axon}/api/config/countries`));
    }
    
    const response = await axios.get(`http://${selectedValidator.Axon}/api/config/countries`);
    availableRegions = response.data;
    spinner.succeed(chalk.green(`Found ${availableRegions.length} available regions`));
    
    if (debugMode) {
      console.log(chalk.blue('Debug: Available regions:'), availableRegions);
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch regions'));
    console.error(chalk.red(`Error: ${error.message}`));
    
    if (debugMode) {
      console.log(chalk.blue('Debug: Full error:'), error);
    }
    
    // Fallback to some common country codes
    console.log(chalk.yellow('Using fallback region list...'));
    availableRegions = ['US', 'GB', 'DE', 'FR', 'JP'];
  }
  
  // Region selection and lease time
  let selectedRegion, leaseTime;
  
  if (options.region && options.time) {
    // Use command line arguments
    const regionCode = options.region.toUpperCase();
    if (!['US', 'EU', 'ASIA'].includes(regionCode)) {
      console.error(chalk.red('Invalid region. Please use US, EU, or ASIA.'));
      process.exit(1);
    }
    
    // Find a country code in the selected region
    const regionCountries = {
      'US': ['US', 'CA'],
      'EU': ['DE', 'FR', 'GB', 'IT', 'ES'],
      'ASIA': ['JP', 'KR', 'SG', 'IN']
    };
    
    const possibleCountries = regionCountries[regionCode].filter(code => 
      availableRegions.includes(code)
    );
    
    if (possibleCountries.length === 0) {
      console.error(chalk.red(`No available countries in ${regionCode} region.`));
      
      if (debugMode) {
        console.log(chalk.blue('Debug: Region countries:'), regionCountries[regionCode]);
        console.log(chalk.blue('Debug: Available regions:'), availableRegions);
      }
      
      // Fallback to first available region
      selectedRegion = availableRegions[0];
      console.log(chalk.yellow(`Falling back to ${selectedRegion}`));
    } else {
      selectedRegion = possibleCountries[0];
    }
    
    leaseTime = parseInt(options.time);
    
    if (isNaN(leaseTime) || leaseTime <= 0) {
      console.error(chalk.red('Lease time must be a positive number.'));
      process.exit(1);
    }
  } else if (!quietMode) {
    // Interactive mode
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    
    // Try to get region names, fall back to codes if it fails
    const regionChoices = availableRegions.map(code => {
      try {
        return {
          name: regionNames.of(code),
          value: code
        };
      } catch (error) {
        return {
          name: code,
          value: code
        };
      }
    });
    
    const { region } = await inquirer.prompt([{
      type: 'list',
      name: 'region',
      message: 'Select exit region:',
      choices: regionChoices
    }]);
    
    selectedRegion = region;
    
    const { time } = await inquirer.prompt([{
      type: 'input',
      name: 'time',
      message: 'Connection time (minutes):',
      default: '30',
      validate: value => {
        const num = parseInt(value);
        return (!isNaN(num) && num > 0) ? true : 'Please enter a positive number';
      }
    }]);
    
    leaseTime = parseInt(time);
  } else {
    // Default values for quiet mode
    selectedRegion = availableRegions[0];
    leaseTime = 30;
  }
  
  console.log(chalk.cyan(`🌍 Selected region: ${selectedRegion}`));
  console.log(chalk.cyan(`⏱️ Connection time: ${leaseTime} minutes`));
  
  // Get IP before connection
  const ipBefore = await getPublicIP();
  console.log(chalk.yellow(`📡 Current IP: ${ipBefore}`));
  const wifiSecurity = await checkWifiSecurity();
  const locationSecurity = await checkLocationSecurity(ipBefore);
  
  // Show initial dashboard
  showSecurityDashboard(wifiSecurity, locationSecurity, false);
  
  // High risk notification
  if (wifiSecurity.risk === RISK_LEVELS.HIGH || locationSecurity.risk === RISK_LEVELS.HIGH) {
    termKit.bold.red('\n⚠️  HIGH SECURITY RISK DETECTED! VPN STRONGLY RECOMMENDED ⚠️\n\n');
  }

  // Connect to VPN
  const connectSpinner = ora(`Connecting to TPN VPN (${selectedRegion})...`).start();
  let peerConfig;
  
  try {
    const requestUrl = `http://${selectedValidator.Axon}/api/config/new`;
    const params = {
      format: 'text',
      geo: selectedRegion,
      lease_minutes: leaseTime
    };
    
    if (debugMode) {
      console.log(chalk.blue('Debug: Request URL:'), requestUrl);
      console.log(chalk.blue('Debug: Request params:'), params);
    }
    
    const response = await axios.get(requestUrl, { params });
    peerConfig = response.data;
    connectSpinner.succeed(chalk.green(`Successfully connected to ${selectedRegion}`));
    
    if (debugMode) {
      console.log(chalk.blue('Debug: Got peer config (first 100 chars):'), peerConfig.substring(0, 100) + '...');
    }
  } catch (error) {
    connectSpinner.fail(chalk.red('Connection failed'));
    console.error(chalk.red(`Error: ${error.message}`));
    
    if (debugMode) {
      console.log(chalk.blue('Debug: Full error:'), error);
    }
    
    process.exit(1);
  }
  
  // Save WireGuard configuration
  const cfgPath = process.getuid && process.getuid() === 0
    ? '/etc/wireguard/tpn-connect.conf'
    : './tpn-connect.conf';
  
  try {
    fs.writeFileSync(cfgPath, peerConfig);
    console.log(chalk.gray(`📄 Configuration saved to ${cfgPath}`));
  } catch (error) {
    console.error(chalk.red(`Failed to write config file: ${error.message}`));
    process.exit(1);
  }
  
  // Start WireGuard connection with safe connect
  console.log(boxen(chalk.blue(`⚙️ Activating TPN VPN connection to ${selectedRegion}`), {
    padding: 1,
    borderColor: 'blue',
    borderStyle: 'round'
  }));
  
  try {
    if (debugMode) {
      console.log(chalk.blue('Debug: Running command with safe connect wrapper'));
    }
    
    // Use safeConnect instead of direct command
    const success = await safeConnect(cfgPath);
    if (!success) {
      throw new Error("Failed to establish connection");
    }
  } catch (error) {
    console.error(chalk.red(`Failed to start WireGuard: ${error.message}`));
    
    if (debugMode) {
      console.log(chalk.blue('Debug: Full error:'), error);
    }
    
    process.exit(1);
  }
  
  // Get IP after connection
  const ipAfter = await getPublicIP();
  console.log(chalk.green(`📡 New IP: ${ipAfter}`));
  console.log(chalk.green('\n✅ Connection established! You are now connected to TPN VPN.'));
  console.log(chalk.gray('⚠️ Press Ctrl+C to disconnect\n'));
  
  if (locationSecurity.location) {
    connectionStats.countriesVisited.add(locationSecurity.location.country);
  }
  connectionStats.totalConnections++;
  
  // Create progress bar for lease time
  const totalSeconds = leaseTime * 60;
  const progressBar = new cliProgress.SingleBar({
    format: chalk.cyan('Connection time: [{bar}] {percentage}% | {value}/{total}s'),
    hideCursor: true
  }, cliProgress.Presets.shades_classic);
  
  progressBar.start(totalSeconds, 0);
  let elapsed = 0;
  
  const timer = setInterval(() => {
    elapsed++;
    progressBar.update(elapsed);
    connectionStats.totalTime++; // Update total time
    
    if (elapsed >= totalSeconds) {
      clearInterval(timer);
      progressBar.stop();
      console.log(chalk.yellow('\n⏰ Connection time expired. Disconnecting...'));
      
      // Disconnect
      execaCommand(`wg-quick down ${cfgPath}`)
        .then(() => {
          console.log(chalk.green('✅ Successfully disconnected'));
          process.exit(0);
        })
        .catch(error => {
          console.error(chalk.red(`Failed to disconnect: ${error.message}`));
          process.exit(1);
        });
    }
  }, 1000);
  
  // Add keyboard controls for dashboard
  termKit.grabInput();
  termKit.on('key', async (key) => {
    if (key === 'p' || key === 'P') {
      // Panic button
      await panicButtonAction(cfgPath);
      process.exit(0);
    } else if (key === 'r' || key === 'R') {
      // Refresh dashboard with updated security info
      const currentIp = await getPublicIP();
      const refreshedWifiSecurity = await checkWifiSecurity();
      const refreshedLocationSecurity = await checkLocationSecurity(currentIp);
      showSecurityDashboard(refreshedWifiSecurity, refreshedLocationSecurity, true);
    } else if (key === 'd' || key === 'D') {
      // Disconnect
      termKit.grabInput(false);
      progressBar.stop();
      console.log(chalk.yellow('\n\nDisconnecting from TPN VPN...'));
      
      execaCommand(`wg-quick down ${cfgPath}`)
        .then(() => {
          console.log(chalk.green('✅ Successfully disconnected'));
          process.exit(0);
        })
        .catch(error => {
          console.error(chalk.red(`Failed to disconnect: ${error.message}`));
          process.exit(1);
        });
    } else if (key === 'q' || key === 'Q' || key === 'CTRL_C') {
      // Quit
      termKit.grabInput(false);
      progressBar.stop();
      console.log(chalk.yellow('\n\nDisconnecting from TPN VPN...'));
      
      execaCommand(`wg-quick down ${cfgPath}`)
        .then(() => {
          console.log(chalk.green('✅ Successfully disconnected'));
          process.exit(0);
        })
        .catch(error => {
          console.error(chalk.red(`Failed to disconnect: ${error.message}`));
          process.exit(1);
        });
    }
  });
}

// Run main function
main().catch(error => {
  console.error(chalk.red(`An error occurred: ${error.message}`));
  console.error(chalk.red(error.stack));
  process.exit(1);
});