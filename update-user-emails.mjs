import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log('📧 Actualizando emails de usuarios de prueba...\n');

  // Actualizar Juan Pérez (Apartamento 1)
  await connection.execute(
    'UPDATE users SET email = ? WHERE apartmentId = 1 AND name = ?',
    ['fsanta01@gmail.com', 'Juan Pérez']
  );
  console.log('✅ Juan Pérez → fsanta01@gmail.com');

  // Actualizar María García (Apartamento 2)
  await connection.execute(
    'UPDATE users SET email = ? WHERE apartmentId = 2 AND name = ?',
    ['frank1411@hotmail.com', 'María García']
  );
  console.log('✅ María García → frank1411@hotmail.com');

  console.log('\n📋 Usuarios Actualizados:');
  console.log('================================');
  console.log('Usuario 1:');
  console.log('  Nombre: Juan Pérez');
  console.log('  Email: fsanta01@gmail.com');
  console.log('  Apartamento: 1');
  console.log('  Estado: Aprobado (acceso inmediato)');
  console.log('');
  console.log('Usuario 2:');
  console.log('  Nombre: María García');
  console.log('  Email: frank1411@hotmail.com');
  console.log('  Apartamento: 2');
  console.log('  Estado: PENDIENTE DE APROBACIÓN');
  console.log('================================\n');
  console.log('💡 Ahora recibirás códigos de verificación en estos emails reales.');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  await connection.end();
}
