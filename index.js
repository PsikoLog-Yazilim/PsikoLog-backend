const express = require('express');
const app = express();
const cors = require('cors')
const port = 3000;
const bodyParser = require('body-parser');

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

// JSON veri analizini etkinleştir
app.use(bodyParser.json());

// PostgreSQL bağlantısını test etmek için basit bir endpoint oluşturun
app.get('/', (req, res) => {
  pool.query('SELECT NOW()', (error, results) => {
    if (error) {
      console.error('Hata:', error);
      res.status(500).send('Sunucu hatasi');
    } else {
      res.send('PostgreSQL ile baglanti basarili! Sonuc: ' + results.rows[0].now);

      // Hasta tablosunu oluşturma sorgusu
      const createPatientTableQuery = `CREATE TABLE IF NOT EXISTS patients (
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

      // Psikolog tablosunu oluşturma sorgusu
      const createPsychologistTableQuery = `CREATE TABLE IF NOT EXISTS psychologists (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        surname VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      )`;

      // Psikolog tablosunu oluştur
      pool.query(createPsychologistTableQuery, (error, results) => {
        if (error) {
          console.error('Hata:', error);
        } else {
          console.log('Psikolog tablosu oluşturuldu veya zaten mevcut');
        }
      });
    }
  });
});

// Hasta kayit endpoint
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
      res.status(201).json({ success: true, message: 'Kullanici basariyla kaydedildi.' });
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
        res.status(200).json({ success: true, message: 'Kullanici basariyla giriş yapti.' });
      } else {
        // Kullanıcı bulunamadı, giriş başarısız
        res.status(401).json({ success: false, message: 'Geçersiz e-posta veya parola.' });
      }
    }
  });
});

// Psikolog kayit endpoint
app.post('/psychologist/register', (req, res) => {
  const { name, surname, email, password } = req.body;

  // PostgreSQL sorgusu
  const query = 'INSERT INTO psychologists (name, surname, email, password) VALUES ($1, $2, $3, $4)';

  // Hastayı veritabanına ekle
  pool.query(query, [name, surname, email, password], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(201).json({ success: true, message: 'Psikolog basariyla kaydedildi.' });
    }
  });
});

// Psikolog giriş endpoint
app.post('/psychologist/login', (req, res) => {
  const { email, password } = req.body;

  // PostgreSQL sorgusu
  const query = 'SELECT * FROM psychologists WHERE email = $1 AND password = $2';

  // Hastayı veritabanında bulma
  pool.query(query, [email, password], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rowCount > 0) {
        // Kullanıcı bulundu, giriş başarılı
        res.status(200).json({ success: true, message: 'Kullanici basariyla giriş yapti.' });
      } else {
        // Kullanıcı bulunamadı, giriş başarısız
        res.status(401).json({ success: false, message: 'Geçersiz e-posta veya parola.' });
      }
    }
  });
});

// Express.js sunucusunu başlatın
app.listen(port, () => {
  console.log('Sunucu calisiyor: http://localhost:' + port);
});