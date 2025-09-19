#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const path = require('path');

console.log('🔍 Checking for existing development servers...');

// Kill any existing Next.js dev processes
exec('pkill -f "next dev"', (error) => {
  if (error && error.code !== 1) {
    console.log('⚠️  Error killing existing processes:', error.message);
  } else {
    console.log('✅ Cleared any existing dev servers');
  }

  // Kill processes on ports 3000-3010 (common dev ports)
  const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010];
  let portsChecked = 0;

  ports.forEach(port => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (stdout.trim()) {
        const pid = stdout.trim();
        exec(`kill -9 ${pid}`, (killError) => {
          if (!killError) {
            console.log(`🔫 Killed process on port ${port} (PID: ${pid})`);
          }
        });
      }

      portsChecked++;
      if (portsChecked === ports.length) {
        startDevServer();
      }
    });
  });

  // Fallback if no ports to check
  if (ports.length === 0) {
    startDevServer();
  }
});

function startDevServer() {
  console.log('🚀 Starting fresh development server...');

  // Clean .next directory
  exec('rm -rf .next', (error) => {
    if (error) {
      console.log('⚠️  Could not clean .next directory:', error.message);
    } else {
      console.log('🧹 Cleaned .next directory');
    }

    // Start the dev server
    const devProcess = spawn('npm', ['run', 'dev:next'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    devProcess.on('error', (error) => {
      console.error('❌ Failed to start dev server:', error);
      process.exit(1);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down dev server...');
      devProcess.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      devProcess.kill('SIGTERM');
      process.exit(0);
    });
  });
}