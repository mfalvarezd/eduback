const fs = require('fs')
const path = require('path')

// Función para copiar directorio recursivamente
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
      console.log(`✅ Copiado: ${srcPath} -> ${destPath}`)
    }
  }
}

// Copiar assets
try {
  console.log('📁 Copiando assets...')

  // Crear directorio dist si no existe
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true })
  }

  // Copiar public a dist
  if (fs.existsSync('public')) {
    copyDir('public', 'dist/public')
    console.log('✅ Assets copiados exitosamente')
  } else {
    console.log('⚠️  Directorio public no encontrado')
  }
} catch (error) {
  console.error('❌ Error copiando assets:', error.message)
}
