#!/usr/bin/env node

console.log('Starting debug...');

// Check Node.js version
console.log('Node.js version:', process.version);

// Check for required files
const fs = require('fs');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('Files in directory:');

try {
  const files = fs.readdirSync(__dirname);
  files.forEach(file => {
    console.log(`- ${file}`);
  });
} catch (error) {
  console.error('Error reading directory:', error.message);
}

// Try to load validators.json
console.log('\nTrying to load validators.json:');
try {
  const validatorsPath = path.join(__dirname, 'validators.json');
  console.log('Validators path:', validatorsPath);
  
  if (fs.existsSync(validatorsPath)) {
    console.log('validators.json exists');
    const validatorsContent = fs.readFileSync(validatorsPath, 'utf8');
    console.log('Content:', validatorsContent.substring(0, 100) + '...');
    
    const validators = JSON.parse(validatorsContent);
    console.log('Parsed successfully, found', validators.length, 'validators');
  } else {
    console.error('validators.json does not exist');
  }
} catch (error) {
  console.error('Error with validators.json:', error.message);
}

// Check for WireGuard
console.log('\nChecking for WireGuard:');
const { execSync } = require('child_process');
try {
  const wgOutput = execSync('which wg').toString().trim();
  console.log('WireGuard found at:', wgOutput);
} catch (error) {
  console.error('WireGuard not found:', error.message);
}

// Check network connectivity
console.log('\nChecking network connectivity:');
const http = require('http');
const https = require('https');

// Helper function for a simple HTTP GET request
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const request = lib.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error(`HTTP status code ${response.statusCode}`));
        return;
      }
      
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(body).toString()
        });
      });
    });
    
    request.on('error', (err) => reject(err));
    request.end();
  });
}

// Test connections to common websites
async function testConnections() {
  try {
    console.log('Testing connection to google.com...');
    const googleResult = await httpGet('http://www.google.com');
    console.log('Google status:', googleResult.statusCode);
    
    // Try to connect to the first validator
    try {
      const validatorsPath = path.join(__dirname, 'validators.json');
      const validators = JSON.parse(fs.readFileSync(validatorsPath, 'utf8'));
      
      if (validators.length > 0) {
        const firstValidator = validators[0];
        console.log(`Testing connection to validator ${firstValidator.UID} (${firstValidator.Axon})...`);
        
        try {
          const validatorUrl = `http://${firstValidator.Axon}/api/config/countries`;
          console.log('URL:', validatorUrl);
          
          const validatorResult = await httpGet(validatorUrl);
          console.log('Validator status:', validatorResult.statusCode);
          console.log('Response:', validatorResult.body.substring(0, 100) + '...');
        } catch (error) {
          console.error('Error connecting to validator:', error.message);
        }
      }
    } catch (error) {
      console.error('Could not test validator connection:', error.message);
    }
  } catch (error) {
    console.error('Error testing connections:', error.message);
  }
}

testConnections().then(() => {
  console.log('\nDebug complete.');
}).catch(error => {
  console.error('Debug failed:', error.message);
});