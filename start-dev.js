const { spawn } = require('child_process');
const path = require('path');

console.log('Iniciando core-ms en modo desarrollo con ignorar errores de TypeScript...');

// Configurar variables de entorno para ignorar errores de TypeScript
process.env.TS_NODE_TRANSPILE_ONLY = 'true';

// Ejecutar nest start con --skipLibCheck
const nestProcess = spawn('npx', ['nest', 'start', '--watch', '--skipLibCheck'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'develop',
  }
});

nestProcess.on('close', (code) => {
  console.log(`Proceso terminado con código ${code}`);
});
