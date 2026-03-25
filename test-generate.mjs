import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'gateway05.us-east-1.prod.aws.tidbcloud.com',
  user: 'XPnY5WHAoUAmsBG.root',
  password: 'Q9Vw9OrED35wUg09Epsq',
  port: 4000,
  database: 'Y5QQycr7nHpgztoUcfZWDA'
});

// Obtener configuración
const [config] = await connection.execute('SELECT apartmentNamePattern FROM condominiumConfig LIMIT 1');
console.log('Patrón actual:', config[0].apartmentNamePattern);

// Obtener pisos y apartamentos
const [floors] = await connection.execute('SELECT id, floorNumber, floorName FROM floors ORDER BY floorNumber');
const [apartments] = await connection.execute('SELECT id, floorId, apartmentNumber FROM apartments ORDER BY floorId, apartmentNumber');

console.log('\nPisos:', floors.length);
console.log('Apartamentos:', apartments.length);

// Mostrar primeros apartamentos
console.log('\nPrimeros 12 apartamentos:');
apartments.slice(0, 12).forEach(apt => {
  const floor = floors.find(f => f.id === apt.floorId);
  console.log(`ID: ${apt.id}, Floor: ${floor.floorNumber}, Apt: ${apt.apartmentNumber}`);
});

await connection.end();
