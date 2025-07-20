const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Función para asegurar que un directorio existe
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Directorio creado: ${dirPath}`);
  }
}

// Función para copiar archivos de esquema
function copySchemaFiles() {
  // Directorios específicos donde sabemos que hay esquemas
  const schemaDirectories = [
    'src/user/schemas',
    'src/role/schemas',
    'src/permission/schemas',
    'src/company/schemas',
    'src/access-control/schemas'
  ];

  schemaDirectories.forEach(schemaDir => {
    const srcDir = path.join(__dirname, schemaDir);
    const destDir = path.join(__dirname, 'dist', schemaDir);

    // Verificar si el directorio fuente existe
    if (fs.existsSync(srcDir)) {
      // Asegurar que el directorio destino existe
      ensureDirectoryExists(destDir);

      // Copiar archivos de esquema
      fs.readdirSync(srcDir).forEach(file => {
        if (file.endsWith('.schema.ts') || file.endsWith('.schema.js')) {
          const srcFile = path.join(srcDir, file);
          const destFile = path.join(destDir, file);
          fs.copyFileSync(srcFile, destFile);
          console.log(`Copiado: ${srcFile} -> ${destFile}`);

          // Si es un archivo .ts, también compilarlo a .js
          if (file.endsWith('.ts')) {
            const jsFile = file.replace('.ts', '.js');
            const destJsFile = path.join(destDir, jsFile);
            
            // Copiar el archivo .js si existe (compilado por tsc)
            const srcJsFile = path.join(__dirname, 'dist', schemaDir, jsFile);
            if (fs.existsSync(srcJsFile)) {
              fs.copyFileSync(srcJsFile, destJsFile);
              console.log(`Copiado: ${srcJsFile} -> ${destJsFile}`);
            }
          }
        }
      });
    } else {
      console.log(`Directorio de esquemas no encontrado: ${srcDir}`);
    }
  });
}

// Ejecutar la copia de archivos
console.log('Copiando archivos de esquema...');
copySchemaFiles();
console.log('Archivos de esquema copiados correctamente.');
