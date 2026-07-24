const http = require('http');

const request = (options, postData) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

async function run() {
  try {
    console.log('1. Attempting login as Super Admin...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'jaychandra@techmechatorque.com',
      password: '2288'
    });

    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.data);
      return;
    }

    const token = loginRes.data.data.token;
    console.log('✅ Logged in successfully.');

    console.log('2. Fetching students list...');
    const studentsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (studentsRes.status !== 200) {
      console.error('Failed to get students:', studentsRes.data);
      return;
    }

    const students = studentsRes.data.data || [];
    if (students.length === 0) {
      console.log('No students found to test payment on.');
      return;
    }

    const student = students[0];
    console.log(`✅ Found student: ${student.name} (${student._id})`);

    console.log('3. Fetching payments for student...');
    const paymentsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/payments?studentId=${student._id}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const payments = paymentsRes.data.data || [];
    console.log(`✅ Payments count: ${payments.length}`);

    const duePayment = payments.find(p => p.status !== 'Paid');
    if (duePayment) {
      console.log(`4. Settling due payment invoice: ${duePayment.referenceNumber} (${duePayment._id}) of amount ${duePayment.amount}...`);
      const payRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/payments/${duePayment._id}/pay`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, {
        method: 'UPI',
        referenceNumber: `TXN-${Date.now().toString().substring(5)}`,
        amount: duePayment.amount
      });

      console.log('Response Status:', payRes.status);
      console.log('Response Body:', JSON.stringify(payRes.data, null, 2));
    } else {
      console.log('4. Recording direct payment transaction (no due invoice exists)...');
      const payRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/payments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }, {
        studentId: student._id,
        amount: 2500,
        method: 'UPI',
        referenceNumber: `TXN-${Date.now().toString().substring(5)}`
      });

      console.log('Response Status:', payRes.status);
      console.log('Response Body:', JSON.stringify(payRes.data, null, 2));
    }
  } catch (error) {
    console.error('Error running test script:', error);
  }
}

run();
