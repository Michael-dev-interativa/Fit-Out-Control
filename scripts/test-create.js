import http from 'http';

const payload = JSON.stringify({ id_empreendimento: 1, numero_diario: '99', data_diario: '2026-02-18' });
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/diarios-obra',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, res => {
  console.log('statusCode:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('body:', data);
    process.exit(0);
  });
});

req.on('error', err => {
  console.error('request error', err);
  process.exit(2);
});

req.write(payload);
req.end();
