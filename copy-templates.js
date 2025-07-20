const fs = require('fs');
const path = require('path');

// Función para crear directorios recursivamente si no existen
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Directorio creado: ${directory}`);
  }
}

// Función para copiar archivos
function copyFiles(sourceDir, targetDir, fileExtension) {
  // Asegurarse de que el directorio de destino exista
  ensureDirectoryExists(targetDir);

  // Leer todos los archivos en el directorio fuente
  const files = fs.readdirSync(sourceDir);

  // Filtrar por extensión si se proporciona
  const filesToCopy = fileExtension 
    ? files.filter(file => file.endsWith(fileExtension))
    : files;

  // Copiar cada archivo
  filesToCopy.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);

    // Verificar si es un directorio
    if (fs.statSync(sourcePath).isDirectory()) {
      // Copiar recursivamente el directorio
      copyFiles(sourcePath, targetPath, fileExtension);
    } else {
      // Copiar el archivo
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Archivo copiado: ${targetPath}`);
    }
  });
}

// Copiar templates de correo electrónico
const sourceTemplatesDir = path.join(__dirname, 'src', 'mail', 'templates');
// Ajustamos la ruta para que coincida con la estructura en el contenedor Docker
const targetTemplatesDir = path.join(__dirname, 'dist', 'mail', 'templates');

// También copiamos a la ruta antigua por compatibilidad
const legacyTargetDir = path.join(__dirname, 'dist', 'src', 'mail', 'templates');

console.log('Copiando templates de correo electrónico...');
copyFiles(sourceTemplatesDir, targetTemplatesDir, '.html');

// También copiar a la ruta alternativa para compatibilidad
console.log('Copiando templates a ruta alternativa...');
copyFiles(sourceTemplatesDir, legacyTargetDir, '.html');

console.log('Proceso completado.');
