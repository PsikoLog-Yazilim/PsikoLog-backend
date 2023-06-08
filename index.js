const express = require('express');
const app = express();
const cors = require('cors')
const port = 3000;
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "PsikoLogJWT";

// JWT
function createToken(userId, userType) {
  const payload = { userId, userType };
  const secretKey = JWT_SECRET; // JWT'nin imzalamak için kullanacağınız gizli anahtar
  const options = { expiresIn: '5h' }; // Token süresi (örnekte 1 saat)

  return jwt.sign(payload, secretKey, options);
}

// Token Doğrula
function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(' ')[1];
  console.log("verifyToken: " + token);

  if (!token) {
    console.log("Token bulunamadi.");
    return res.status(401).json({ success: false, message: 'Token bulunamadı.' });
  }

  jwt.verify(token, JWT_SECRET, (error, decoded) => {
    if (error) {
      console.log("Gecersiz token.");
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

  // Randevu tablosunu oluşturma sorgusu
  const createAppointmentTableQuery = `CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  psychologist_id INTEGER NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(255) NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE,
  FOREIGN KEY (psychologist_id) REFERENCES psychologists (id) ON DELETE CASCADE
);`;

  // Randevu tablosunu oluştur
  pool.query(createAppointmentTableQuery, (error, results) => {
    if (error) {
      console.error('Hata:', error);
    } else {
      console.log('Randevu tablosu oluşturuldu veya zaten mevcut');
    }
  });

  // Yorumlar tablosunu oluşturma sorgusu
  const createCommentTableQuery = `CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, patient_id INTEGER NOT NULL, psychologist_id INTEGER NOT NULL, comment_text TEXT NOT NULL, FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE, FOREIGN KEY(psychologist_id) REFERENCES psychologists(id) ON DELETE CASCADE);`;

  // Yorumlar tablosunu oluştur
  pool.query(createCommentTableQuery, (error, results) => {
    if (error) {
      console.error('Hata:', error);
    } else {
      console.log('Yorumlar tablosu oluşturuldu veya zaten mevcut');
    }
  });

  // Bloglar tablosunu oluşturma sorgusu
  const createBlogTableQuery = `CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    psychologist_id INTEGER NOT NULL,
    FOREIGN KEY (psychologist_id) REFERENCES psychologists (id) ON DELETE CASCADE
  )`;

  // Bloglar tablosunu oluştur
  pool.query(createBlogTableQuery, (error, results) => {
    if (error) {
      console.error('Hata:', error);
    } else {
      console.log('Bloglar tablosu oluşturuldu veya zaten mevcut');
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
        const token = createToken(userId, "Patient");

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
        const token = createToken(userId, "Psychologist");

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

// Psikolog profil endpoint'i
app.get('/psychologists/:id', (req, res) => {
  const id = req.params.id;

  // PostgreSQL sorgusu
  const query = 'SELECT * FROM psychologists WHERE id = $1';

  // Hastanın randevu taleplerini getir
  pool.query(query, [id], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(200).json({ success: true, psychologist: results.rows[0] });
    }
  });
});


// Randevu talebi oluşturma endpoint'i
app.post('/appointments', verifyToken, (req, res) => {
  const { patientId, psychologistId, appointmentDate, appointmentTime } = req.body;

  // PostgreSQL sorgusu
  const query = 'INSERT INTO appointments (patient_id, psychologist_id, appointment_date, appointment_time, status) VALUES ($1, $2, $3, $4, $5)';

  // Randevu talebini veritabanına ekle
  pool.query(query, [patientId, psychologistId, appointmentDate, appointmentTime, 'pending'], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(201).json({ success: true, message: 'Randevu talebi başarıyla oluşturuldu.' });
    }
  });
});

// Hastanın randevu taleplerini getirme endpoint'i
app.get('/patient/:id/appointments', verifyToken, (req, res) => {
  const patientId = req.params.id;

  // PostgreSQL sorgusu
  const query = `SELECT appointments.id, appointments.status, appointments.appointment_date, appointments.appointment_time, psychologists.name, psychologists.surname, 
  psychologists.email FROM appointments 
  INNER JOIN psychologists ON appointments.psychologist_id = psychologists.id 
  WHERE appointments.patient_id = $1`;

  // Hastanın randevu taleplerini getir
  pool.query(query, [patientId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(200).json({ success: true, appointments: results.rows });
    }
  });
});

// Hastanın randevu taleplerini iptal etme endpoint'i
app.delete('/appointments/:appointmentId', verifyToken, (req, res) => {
  const appointmentId = req.params.appointmentId;
  const patientId = req.userId;

  // PostgreSQL sorgusu
  const query = 'DELETE FROM appointments WHERE id = $1 AND patient_id = $2';

  // Randevu talebini iptal et
  pool.query(query, [appointmentId, patientId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rowCount > 0) {
        res.status(200).json({ success: true, message: 'Randevu talebi başarıyla iptal edildi.' });
      } else {
        res.status(404).json({ success: false, message: 'Belirtilen randevu talebi bulunamadı.' });
      }
    }
  });
});

// Psikologun randevu taleplerini getirme endpoint'i
app.get('/psychologist/appointments', verifyToken, (req, res) => {
  const psychologistId = req.userId;

  // PostgreSQL sorgusu
  const query = `SELECT appointments.id, appointments.status, appointments.appointment_date, appointments.appointment_time, patients.name, patients.surname, 
  patients.email FROM appointments 
  INNER JOIN patients ON appointments.patient_id = patients.id 
  WHERE appointments.psychologist_id = $1`;


  // Psikologun randevu taleplerini getir
  pool.query(query, [psychologistId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(200).json({ success: true, appointments: results.rows });
    }
  });
});

// Psikologun randevu taleplerini onaylama endpoint'i
app.patch('/psychologist/appointments/:id/approve', verifyToken, (req, res) => {
  const appointmentId = req.params.id;
  const psychologistId = req.userId;

  // PostgreSQL sorgusu
  const query = 'UPDATE appointments SET status = $1 WHERE id = $2 AND psychologist_id = $3';

  // Randevu talebini onayla
  pool.query(query, ['approved', appointmentId, psychologistId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rowCount > 0) {
        res.status(200).json({ success: true, message: 'Randevu talebi başarıyla onaylandı.' });
      } else {
        res.status(404).json({ success: false, message: 'Belirtilen randevu talebi bulunamadı.' });
      }
    }
  });
});

// Psikologun randevu taleplerini reddetme endpoint'i
app.patch('/psychologist/appointments/:id/decline', verifyToken, (req, res) => {
  const appointmentId = req.params.id;
  const psychologistId = req.userId;

  // PostgreSQL sorgusu
  const query = 'UPDATE appointments SET status = $1 WHERE id = $2 AND psychologist_id = $3';

  // Randevu talebini reddet
  pool.query(query, ['declined', appointmentId, psychologistId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rowCount > 0) {
        res.status(200).json({ success: true, message: 'Randevu talebi başarıyla iptal edildi.' });
      } else {
        res.status(404).json({ success: false, message: 'Belirtilen randevu talebi bulunamadı.' });
      }
    }
  });
});

// Psikoloğa yorum yapma endpoint'i
app.post('/psychologist/:id/comment', verifyToken, (req, res) => {
  const patientId = req.userId;
  const psychologistId = req.params.id;
  const commentText = req.body.commentText;
  console.log("comment text: " + commentText);

  // PostgreSQL sorgusu
  const query = 'INSERT INTO comments (patient_id, psychologist_id, comment_text) VALUES ($1, $2, $3)';

  // Yorumu veritabanına ekle
  pool.query(query, [patientId, psychologistId, commentText], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(201).json({ success: true, message: 'Yorum başarıyla eklendi.' });
    }
  });
});

// Psikoloğun yorumlarını getirme endpoint'i
app.get('/psychologist/:id/comments', (req, res) => {
  const psychologistId = req.params.id;

  // PostgreSQL sorgusu
  const query = 'SELECT comments.*, patients.name, patients.surname FROM comments INNER JOIN patients ON comments.patient_id = patients.id WHERE comments.psychologist_id = $1';

  // Yorumları veritabanından getir
  pool.query(query, [psychologistId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(200).json({ success: true, comments: results.rows });
    }
  });
});

// Psikologun blog yazısı ekleme endpoint
app.post('/createBlogPost', verifyToken, (req, res) => {
  const { title, content } = req.body;
  const psychologist_id = req.userId;

  // PostgreSQL sorgusu
  const query = 'INSERT INTO blogs (title, content, psychologist_id) VALUES ($1, $2, $3)';

  // Blog yazısını veritabanına ekle
  pool.query(query, [title, content, psychologist_id], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      res.status(201).json({ success: true, message: 'Blog yazısı başarıyla oluşturuldu.' });
    }
  });
});

// Blog yazısı get endpoint'i
app.get('/blogPost/:postId', (req, res) => {
  const { postId } = req.params;

  // PostgreSQL sorgusu
  const query = `
  SELECT blogs.*, psychologists.name, psychologists.surname, psychologists.email, psychologists.id AS psychologist_id
  FROM blogs
  INNER JOIN psychologists ON blogs.psychologist_id = psychologists.id
  WHERE blogs.id = $1
`;

  // Blog yazısını veritabanından getir
  pool.query(query, [postId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Blog yazısı bulunamadı.' });
      } else {
        const blogPost = results.rows[0];
        res.status(200).json({ success: true, blogPost });
      }
    }
  });
});

// Psikoloğun blog yazilarini getir
app.get('/blogPosts/:id', (req, res) => {
  const { id } = req.params;

  // PostgreSQL sorgusu
  const query = 'SELECT * FROM blogs WHERE psychologist_id = $1';

  // Blog yazısını veritabanından getir
  pool.query(query, [id], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Bir hata oluştu.' });
    } else {
      if (results.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Blog yazısı bulunamadı.' });
      } else {
        const blogPosts = results.rows;
        res.status(200).json({ success: true, blogPosts });
      }
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
