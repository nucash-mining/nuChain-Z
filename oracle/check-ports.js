#!/usr/bin/env node

const net = require('net');

function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true); // Port is available
            });
            server.close();
        });
        
        server.on('error', () => {
            resolve(false); // Port is in use
        });
    });
}

async function findAvailablePort(startPort = 3001) {
    for (let port = startPort; port <= startPort + 10; port++) {
        const available = await checkPort(port);
        if (available) {
            console.log(`✅ Port ${port} is available`);
            return port;
        } else {
            console.log(`❌ Port ${port} is in use`);
        }
    }
    
    throw new Error('No available ports found');
}

// Check common ports
async function main() {
    console.log('🔍 Checking port availability...');
    
    try {
        const availablePort = await findAvailablePort(3001);
        console.log(`🎯 Use port ${availablePort} for the relayer`);
        
        // Check what's using port 3001
        console.log('\n📋 To see what\'s using port 3001:');
        console.log('lsof -i :3001');
        console.log('netstat -tulpn | grep :3001');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = { checkPort, findAvailablePort };