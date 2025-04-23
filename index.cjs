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
  
  // Start WireGuard connection
  console.log(boxen(chalk.blue(`⚙️ Activating TPN VPN connection to ${selectedRegion}`), {
    padding: 1,
    borderColor: 'blue',
    borderStyle: 'round'
  }));
  
  try {
    if (debugMode) {
      console.log(chalk.blue('Debug: Running command:'), `wg-quick up ${cfgPath}`);
    }
    
    await execaCommand(`wg-quick up ${cfgPath}`);
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
  
  // Handle CTRL+C
  process.on('SIGINT', () => {
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
  });
}

// Run main function
main().catch(error => {
  console.error(chalk.red(`An error occurred: ${error.message}`));
  console.error(chalk.red(error.stack));
  process.exit(1);
});