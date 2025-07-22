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
app.use(cors());

// MySQL DB Connection Pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise();

// Configure AWS SDK - This relies on the IAM Role for credentials, not keys.
AWS.config.update({
  region: process.env.AWS_REGION
});

console.log('DEBUG: AWS_REGION is set to:', process.env.AWS_REGION);
console.log('DEBUG: SNS_TOPIC_ARN is set to:', process.env.SNS_TOPIC_ARN);

// Initialize AWS Services
const sns = new AWS.SNS();
const cloudwatch = new AWS.CloudWatch();

// Threshold values
const THRESHOLDS = {
  heartRate: { min: 60, max: 95 },
  temperature: { min: 36.5, max: 40 }
};

// Function to send SNS alert
function sendAlert(patient) {
  const message = `ALERT: Patient ${patient.name} has abnormal vitals!\n\nHeart Rate: ${patient.heart_rate} bpm\nTemperature: ${patient.temperature}°C\nConcern: ${patient.concern}`;
  
  const params = {
    Message: message,
    TopicArn: process.env.SNS_TOPIC_ARN,
    Subject: 'Patient Health Alert'
  };

  sns.publish(params, (err, data) => {
    if (err) console.error('SNS Error:', err);
    else console.log('Alert sent via SNS:', data.MessageId);
  });
}

// Function to publish patient count to CloudWatch
function publishPatientCountMetric(count) {
  const params = {
    MetricData: [{
        MetricName: 'PatientCount',
        Value: count,
        Unit: 'Count'
    }],
    Namespace: 'HealthApp'
  };

  cloudwatch.putMetricData(params, (err, data) => {
    if (err) console.error("CloudWatch Error:", err);
    else console.log("Metric published to CloudWatch.");
  });
}

const isAbnormal = (patient) => {
    return (
        patient.heart_rate < THRESHOLDS.heartRate.min ||
        patient.heart_rate > THRESHOLDS.heartRate.max ||
        patient.temperature < THRESHOLDS.temperature.min ||
        patient.temperature > THRESHOLDS.temperature.max
    );
};

// Add patient API
app.post('/api/patient', async (req, res) => {
  try {
    const { name, age, heartRate, temperature, issue } = req.body;
    
    const sql_insert = 'INSERT INTO patient (name, age, heart_rate, temperature, concern) VALUES (?, ?, ?, ?, ?)';
    const values = [name, age, heartRate, temperature, issue];
    await db.query(sql_insert, values);

    const patientToCheck = {
        name: name,
        heart_rate: heartRate,
        temperature: temperature,
        concern: issue
    };

    if (isAbnormal(patientToCheck)) {
      console.log(`Abnormal vitals detected for ${patientToCheck.name}`);
      sendAlert(patientToCheck);
    }
    
    const [results] = await db.query('SELECT COUNT(*) AS count FROM patient');
    const patientCount = results[0].count;
    publishPatientCountMetric(patientCount);

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