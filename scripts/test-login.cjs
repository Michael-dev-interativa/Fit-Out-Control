// Test login endpoint
const http = require('http');

const data = JSON.stringify({
  email: 'admin@fitout.com',
  password: 'InterativaEng2024'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('\n=== TESTANDO LOGIN ===');
console.log('Email: admin@fitout.com');
console.log('Endpoint: http://localhost:5000/api/auth/login\n');

const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('=== RESPOSTA DO BACKEND ===');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('\n=== DADOS DO USUÁRIO ===');
      if (parsed.user) {
        console.log('user.role:', parsed.user.role);
        console.log('user.perfil_cliente:', parsed.user.perfil_cliente);
        console.log('user.email:', parsed.user.email);
        console.log('user.nome:', parsed.user.nome);
      }
    } catch (e) {
      console.error('Erro ao parsear resposta:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('Erro na requisição:', e.message);
});

req.write(data);
req.end();
