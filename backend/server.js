require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const AWS = require('aws-sdk');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
const corsOptions = {
  origin: 'http://127.0.0.1:5500',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// MySQL DB Connection Pool (More efficient than a single connection)
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise(); // Using .promise() is a modern best practice for async/await syntax

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Uncomment this when SNS is ready
// const sns = new AWS.SNS();

// Threshold values
const THRESHOLDS = {
  heartRate: { min: 60, max: 95 },
  temperature: { min: 36.5, max: 40 }
};

// Uncomment this when SNS is ready
// function sendAlert(patient) {
//   const message = `ALERT: Patient ${patient.name} has abnormal vitals!\n\nHeart Rate: ${patient.heartRate}\nTemperature: ${patient.temperature}`;
//   const params = {
//     Message: message,
//     TopicArn: process.env.SNS_TOPIC_ARN,
//     Subject: 'Patient Health Alert'
//   };
//   sns.publish(params, (err, data) => {
//     if (err) console.error('SNS Error:', err);
//     else console.log('Alert sent:', data.MessageId);
//   });
// }

function isAbnormal(patient) {
  return (
    patient.heartRate < THRESHOLDS.heartRate.min ||
    patient.heartRate > THRESHOLDS.heartRate.max ||
    patient.temperature < THRESHOLDS.temperature.min ||
    patient.temperature > THRESHOLDS.temperature.max
  );
}

// Add patient API
app.post('/api/patient', async (req, res) => {
  try {
    const { name, age, heartRate, temperature, issue } = req.body;
    
    // This query now uses the correct table 'patient' and column names
    const sql_insert = 'INSERT INTO patient (name, age, heart_rate, temperature, concern) VALUES (?, ?, ?, ?, ?)';
    
    // The values are in the correct order to match the query
    const values = [name, age, heartRate, temperature, issue];

    await db.query(sql_insert, values);

    // This part for checking abnormal vitals remains the same
    const patientForCheck = { name, heartRate, temperature, issue };
    if (isAbnormal(patientForCheck)) {
      console.log(`Abnormal vitals detected for ${patientForCheck.name}: HR ${heartRate}, Temp ${temperature}`);
      // sendAlert(patientForCheck); // Uncomment when SNS is set up
    }

    const [results] = await db.query('SELECT COUNT(*) AS count FROM patient');
    if (results[0].count >= 7) {
      console.log('Threshold reached: 7+ patients. This could trigger a CloudWatch alarm.');
    }

    res.status(201).send('Patient added successfully');
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send('Database error');
  }
});

// Get all patients API
app.get('/api/patients', async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM patient ORDER BY id DESC');
    res.json(results);
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).send('DB fetch error');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});