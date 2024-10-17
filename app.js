const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const zip = require('express-zip'); // Ensure express-zip is installed

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to generate SSL
app.post('/generate-ssl', (req, res) => {
  const { domain, organization, country, state, city, email } = req.body;

  // Paths for generated files
  const privateKeyPath = path.join(__dirname, 'certs', `${domain}-key.pem`);
  const csrPath = path.join(__dirname, 'certs', `${domain}-csr.pem`);
  const certPath = path.join(__dirname, 'certs', `${domain}-cert.pem`);

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(path.join(__dirname, 'certs'))) {
    fs.mkdirSync(path.join(__dirname, 'certs'));
  }

  // Generate private key
  exec(`openssl genrsa -out ${privateKeyPath} 2048`, (err) => {
    if (err) return res.status(500).send('Error generating private key');

    // Generate CSR (Certificate Signing Request)
    exec(`openssl req -new -key ${privateKeyPath} -out ${csrPath} -subj "/C=${country}/ST=${state}/L=${city}/O=${organization}/CN=${domain}/emailAddress=${email}"`, (err) => {
      if (err) return res.status(500).send('Error generating CSR');

      // Generate Self-signed Certificate
      exec(`openssl x509 -req -days 365 -in ${csrPath} -signkey ${privateKeyPath} -out ${certPath}`, (err) => {
        if (err) return res.status(500).send('Error generating certificate');

        // Send the certificate and key for download as a zip file
        res.zip([
          { path: privateKeyPath, name: `${domain}-key.pem` },
          { path: certPath, name: `${domain}-cert.pem` }
        ], `${domain}-ssl-certificate.zip`);
        
        // Optional: Cleanup generated files after download
        // fs.unlinkSync(privateKeyPath);
        // fs.unlinkSync(csrPath);
        // fs.unlinkSync(certPath);
      });
    });
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('SSL generator running on port 3000');
});
