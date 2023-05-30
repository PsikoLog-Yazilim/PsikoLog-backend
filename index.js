const express = require('express');
const app = express();
const cors = require('cors')
const port = 3000;
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "PsikoLogJWT";

// JWT
function createToken(userId) {
  const payload = { userId };
  const secretKey = JWT_SECRET; // JWT'nin imzalamak için kullanacağınız gizli anahtar
  const options = { expiresIn: '1h' }; // Token süresi (örnekte 1 saat)

  return jwt.sign(payload, secretKey, options);
}

// Token Doğrula
function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token bulunamadı.' });
  }

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({ success: false, message: 'Geçersiz token.' });
    }

    req.userId = decoded.userId;
    next();
  });
}

// CORS ayarları
app.use(cors());

// PostgreSQL bağlantısı için gerekli yapılandırmayı yapın
const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', // PostgreSQL kullanıcı adınız
  host: 'localhost', // PostgreSQL sunucu adresi (yerel olarak çalışıyorsa 'localhost' olabilir)
  database: 'psikologdb', // PostgreSQL veritabanı adı
  password: '1234', // PostgreSQL şifreniz
  port: 5432 // PostgreSQL port numarası (genellikle 5432'dir)
});

// Tabloları oluşturma fonksiyonu
function createTables() {
  // Hasta tablosunu oluşturma sorgusu
  const createPatientTableQuery = `CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
  )`;

  // Psikolog tablosunu oluşturma sorgusu
  const createPsychologistTableQuery = `CREATE TABLE IF NOT EXISTS psychologists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
  )`;

  // Hasta tablosunu oluştur
  pool.query(createPatientTableQuery, (error, results) => {
    if (error) {
      console.error('Hata:', error);
    } else {
      console.log('Hasta tablosu oluşturuldu veya zaten mevcut');
    }
  });

  // Psikolog tablosunu oluştur
  pool.query(createPsychologistTableQuery, (error, results) => {
    if (error) {
      console.error('Hata:', error);
    } else {
      console.log('Psikolog tablosu oluşturuldu veya zaten mevcut');
    }
  });
}

// JSON veri analizini etkinleştir
app.use(bodyParser.json());

// PostgreSQL bağlantısını test etmek için basit bir endpoint oluşturun
app.get('/', (req, res) => {
  pool.query('SELECT NOW()', (error, results) => {
    if (error) {
      console.error('Hata:', error);
      res.status(500).send('Sunucu hatasi');
    } else {
      res.send('PostgreSQL ile bağlantı başarılı! Sonuç: ' + results.rows[0].now);
    }
  });
});

// Hasta kayıt endpoint
app.post('/patient/register', (req, res) => {
  const { name, surname, email, password } = req.body;

  // PostgreSQL sorgusu
  const query = 'INSERT INTO patients (name, surname, email, password) VALUES ($1, $2, $3, $4)';

  // Hastayı veritabanına ekle
  pool.query(query, [name, surname, email, password], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(201).json({ success: true, message: 'Kullanıcı başarıyla kaydedildi.' });
    }
  });
});

// Hasta giriş endpoint
app.post('/patient/login', (req, res) => {
  const { email, password } = req.body;

  // PostgreSQL sorgusu
  const query = 'SELECT * FROM patients WHERE email = $1 AND password = $2';

  // Hastayı veritabanında bulma
  pool.query(query, [email, password], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rowCount > 0) {
        // Kullanıcı bulundu, giriş başarılı
        const userId = results.rows[0].id;
        const token = createToken(userId);

        res.status(200).json({ success: true, token: token, message: 'Kullanıcı başarıyla giriş yaptı.' });
      } else {
        // Kullanıcı bulunamadı, giriş başarısız
        res.status(401).json({ success: false, message: 'Geçersiz e-posta veya parola.' });
      }
    }
  });
});

// Psikolog kayıt endpoint
app.post('/psychologist/register', (req, res) => {
  const { name, surname, email, password } = req.body;

  // PostgreSQL sorgusu
  const query = 'INSERT INTO psychologists (name, surname, email, password) VALUES ($1, $2, $3, $4)';

  // Psikologu veritabanına ekle
  pool.query(query, [name, surname, email, password], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(201).json({ success: true, message: 'Psikolog başarıyla kaydedildi.' });
    }
  });
});

// Psikolog giriş endpoint
app.post('/psychologist/login', (req, res) => {
  const { email, password } = req.body;

  // PostgreSQL sorgusu
  const query = 'SELECT * FROM psychologists WHERE email = $1 AND password = $2';

  // Psikologu veritabanında bulma
  pool.query(query, [email, password], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rowCount > 0) {
        // Kullanıcı bulundu, giriş başarılı
        const userId = results.rows[0].id;
        const token = createToken(userId);

        res.status(200).json({ success: true, token: token, message: 'Kullanıcı başarıyla giriş yaptı.' });
      } else {
        // Kullanıcı bulunamadı, giriş başarısız
        res.status(401).json({ success: false, message: 'Geçersiz e-posta veya parola.' });
      }
    }
  });
});

// Psikolog listesi endpoint'i
app.get('/psychologists', (req, res) => {
  // PostgreSQL sorgusu
  const query = 'SELECT * FROM psychologists';

  // Psikologları veritabanından getir
  pool.query(query, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(200).json({ success: true, psychologists: results.rows });
    }
  });
});


// Diğer endpointleri buraya ekleyebilirsiniz

// Tabloları oluştur
createTables();

// Express.js sunucusunu başlatın
app.listen(port, () => {
  console.log('Sunucu çalışıyor: http://localhost:' + port);
});
