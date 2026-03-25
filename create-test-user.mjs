import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log('👤 Creando usuario de prueba para Apartamento 1...\n');

  // Crear usuario con openId único
  const openId = `test-apt1-${Date.now()}`;
  const result = await connection.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, apartmentId, isApproved) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [openId, 'Juan Pérez', 'juan.perez@example.com', 'manus', 'user', 1, 1]
  );

  console.log('✅ Usuario creado exitosamente!\n');
  console.log('📋 Credenciales de Prueba:');
  console.log('================================');
  console.log(`OpenID: ${openId}`);
  console.log(`Nombre: Juan Pérez`);
  console.log(`Email: juan.perez@example.com`);
  console.log(`Apartamento: 1`);
  console.log(`Estado: Aprobado`);
  console.log('================================\n');
  console.log('💡 Nota: Este usuario está pre-aprobado y puede acceder inmediatamente al sistema.');
  console.log('   Para otros usuarios, deberán ser aprobados por el administrador en la sección "Solicitudes".');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
