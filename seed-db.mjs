import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log('🌱 Iniciando seeding de base de datos...\n');

  // Limpiar datos existentes
  console.log('Limpiando datos existentes...');
  await connection.execute('DELETE FROM reminders');
  await connection.execute('DELETE FROM payments');
  await connection.execute('DELETE FROM monthlyDebts');
  await connection.execute('DELETE FROM charges');
  await connection.execute('DELETE FROM apartments');
  await connection.execute('DELETE FROM floors');
  await connection.execute('DELETE FROM condominiumConfig');
  console.log('✓ Datos limpiados\n');

  // 1. Crear configuración del condominio
  console.log('Creando configuración del condominio...');
  await connection.execute(
    `INSERT INTO condominiumConfig (id, name, floors, apartmentsPerFloor, baseFee, defaultCurrency, exchangeRate, reminderDay) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, 'Condominio Residencial', 5, 6, '150.00', 'USD', '2600.0000', 5]
  );
  console.log('✓ Configuración creada\n');

  // 2. Crear pisos
  console.log('Creando pisos...');
  const floorNames = ['Planta Baja', 'Piso 1', 'Piso 2', 'Piso 3', 'Piso 4'];
  const floorIds = [];
  
  for (let i = 0; i < 5; i++) {
    const result = await connection.execute(
      'INSERT INTO floors (floorNumber, floorName) VALUES (?, ?)',
      [i, floorNames[i]]
    );
    floorIds.push(result[0].insertId);
  }
  console.log('✓ Pisos creados\n');

  // 3. Crear apartamentos
  console.log('Creando apartamentos...');
  const apartmentIds = [];
  
  for (let i = 0; i < floorIds.length; i++) {
    for (let j = 1; j <= 6; j++) {
      const apartmentNumber = `${i}${String(j).padStart(2, '0')}`;
      const result = await connection.execute(
        'INSERT INTO apartments (floorId, apartmentNumber, unitName) VALUES (?, ?, ?)',
        [floorIds[i], apartmentNumber, `Apt. ${apartmentNumber}`]
      );
      apartmentIds.push(result[0].insertId);
    }
  }
  console.log(`✓ ${apartmentIds.length} apartamentos creados\n`);

  // 4. Crear cobros adicionales
  console.log('Creando cobros adicionales...');
  const charges = [
    { name: 'Agua', description: 'Servicio de agua', amount: '25.00', currency: 'USD', isRecurring: true },
    { name: 'Electricidad', description: 'Servicio de electricidad', amount: '40.00', currency: 'USD', isRecurring: true },
    { name: 'Mantenimiento', description: 'Mantenimiento de áreas comunes', amount: '30.00', currency: 'USD', isRecurring: true },
    { name: 'Seguridad', description: 'Servicio de seguridad 24/7', amount: '50.00', currency: 'USD', isRecurring: true },
  ];

  for (const charge of charges) {
    await connection.execute(
      'INSERT INTO charges (name, description, amount, currency, isRecurring, isActive) VALUES (?, ?, ?, ?, ?, ?)',
      [charge.name, charge.description, charge.amount, charge.currency, charge.isRecurring ? 1 : 0, 1]
    );
  }
  console.log('✓ Cobros adicionales creados\n');

  // 5. Crear deudas mensuales
  console.log('Creando deudas mensuales...');
  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);
  
  const baseFee = 150.00;
  const additionalCharges = charges.reduce((sum, c) => sum + parseFloat(c.amount), 0);
  const totalDue = baseFee + additionalCharges;

  for (let i = 0; i < apartmentIds.length; i++) {
    // Mes actual - algunos pagados, algunos pendientes
    const isPaid = i % 3 === 0; // 1 de cada 3 está pagado
    await connection.execute(
      `INSERT INTO monthlyDebts (apartmentId, month, baseFeeAmount, additionalCharges, totalDue, totalPaid, pendingAmount, currency, isPaid) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        apartmentIds[i],
        currentMonth,
        baseFee.toFixed(2),
        additionalCharges.toFixed(2),
        totalDue.toFixed(2),
        isPaid ? totalDue.toFixed(2) : '0.00',
        isPaid ? '0.00' : totalDue.toFixed(2),
        'USD',
        isPaid ? 1 : 0
      ]
    );

    // Mes anterior - todos pagados
    await connection.execute(
      `INSERT INTO monthlyDebts (apartmentId, month, baseFeeAmount, additionalCharges, totalDue, totalPaid, pendingAmount, currency, isPaid) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        apartmentIds[i],
        previousMonth,
        baseFee.toFixed(2),
        additionalCharges.toFixed(2),
        totalDue.toFixed(2),
        totalDue.toFixed(2),
        '0.00',
        'USD',
        1
      ]
    );
  }
  console.log('✓ Deudas mensuales creadas\n');

  // 6. Crear pagos de ejemplo
  console.log('Creando pagos de ejemplo...');
  for (let i = 0; i < Math.min(5, apartmentIds.length); i++) {
    const status = i % 2 === 0 ? 'approved' : 'pending';
    const submittedDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    await connection.execute(
      `INSERT INTO payments (userId, apartmentId, month, voucherNumber, amount, currency, status, submittedAt, reviewedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        i + 2, // Usuario ID (1 es admin)
        apartmentIds[i],
        currentMonth,
        `PAGO${String(i + 1).padStart(5, '0')}`,
        totalDue.toFixed(2),
        'USD',
        status,
        submittedDate,
        status === 'approved' ? new Date() : null
      ]
    );
  }
  console.log('✓ Pagos de ejemplo creados\n');

  console.log('✅ Seeding completado exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`   - Pisos: 5`);
  console.log(`   - Apartamentos: ${apartmentIds.length}`);
  console.log(`   - Cobros adicionales: ${charges.length}`);
  console.log(`   - Deudas mensuales: ${apartmentIds.length * 2}`);
  console.log(`   - Pagos de ejemplo: 5`);
  console.log('\n💡 Próximos pasos:');
  console.log('   1. Inicia sesión como administrador');
  console.log('   2. Ve a Configuración para ajustar parámetros si es necesario');
  console.log('   3. Revisa el Dashboard para ver el estado de pagos');
  console.log('   4. Gestiona usuarios, cobros y pagos desde el panel administrativo');

} catch (error) {
  console.error('❌ Error durante seeding:', error);
  process.exit(1);
} finally {
  await connection.end();
}
