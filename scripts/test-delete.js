import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/diarios-obra/2',
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json'
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

req.end();
