import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log('👤 Creando usuario de prueba SIN APROBAR para Apartamento 2...\n');

  // Crear usuario con openId único SIN APROBAR
  const openId = `test-apt2-${Date.now()}`;
  const result = await connection.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, apartmentId, isApproved) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [openId, 'María García', 'maria.garcia@example.com', 'manus', 'user', 2, 0]
  );

  console.log('✅ Usuario creado exitosamente!\n');
  console.log('📋 Credenciales de Prueba:');
  console.log('================================');
  console.log(`OpenID: ${openId}`);
  console.log(`Nombre: María García`);
  console.log(`Email: maria.garcia@example.com`);
  console.log(`Apartamento: 2`);
  console.log(`Estado: PENDIENTE DE APROBACIÓN`);
  console.log('================================\n');
  console.log('💡 Instrucciones:');
  console.log('1. Inicia sesión como ADMINISTRADOR');
  console.log('2. Ve a la sección "Solicitudes"');
  console.log('3. Deberías ver la solicitud de María García');
  console.log('4. Apruébala');
  console.log('5. Luego, inicia sesión como María García');
  console.log('6. Verás tu dashboard con info del Apartamento 2 y opción de pagar');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
