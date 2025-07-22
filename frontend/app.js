document.addEventListener('DOMContentLoaded', () => {
   const apiUrl = 'http://localhost:3000/api';

    // Add Patient Form Submission
    const addForm = document.getElementById('add-patient-form');

    if (addForm) {
        addForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const patientData = {
                name: document.getElementById('name').value,
                age: parseInt(document.getElementById('age').value),
                heartRate: parseInt(document.getElementById('heartRate').value),
                temperature: parseFloat(document.getElementById('temperature').value),
                issue: document.getElementById('issue').value
            };

            try {
                const response = await fetch(`${apiUrl}/patient`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patientData)
                });

                if (response.ok) {
                    alert('Patient added successfully!');
                    window.location.href = 'patients.html';
                } else {
                    const text = await response.text();
                    alert('Failed to add patient: ' + text);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please check the console.');
            }
        });
    }

    // Patient List Display
    const patientTableBody = document.getElementById('patient-table-body');

    if (patientTableBody) {
        async function fetchAndDisplayPatients() {
            try {
                const response = await fetch(`${apiUrl}/patients`);
                const patients = await response.json();

                patientTableBody.innerHTML = '';

                patients.forEach(patient => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${patient.name}</td>
                        <td>${patient.age}</td>
                        <td>${patient.temperature}°C</td>
                        <td>${patient.heart_rate}</td>
                        <td>${patient.concern}</td>
                        <td>${new Date(patient.timestamp).toLocaleString()}</td>
                    `;
                    patientTableBody.appendChild(row);
                });
            } catch (error) {
                console.error('Error fetching patients:', error);
                patientTableBody.innerHTML = `<tr><td colspan="6">Failed to load data.</td></tr>`;
            }
        }
        fetchAndDisplayPatients();
    }

    // Alerts Page
    const alertsContainer = document.getElementById('alerts-container');

    if (alertsContainer) {
        const THRESHOLDS = {
            heartRate: { min: 60, max: 95 },
            temperature: { min: 36.5, max: 40 }
        };

        const isAbnormal = (patient) => {
            return (
                patient.heart_rate < THRESHOLDS.heartRate.min ||
                patient.heart_rate > THRESHOLDS.heartRate.max ||
                patient.temperature < THRESHOLDS.temperature.min ||
                patient.temperature > THRESHOLDS.temperature.max
            );
        };

        async function fetchAndDisplayAlerts() {
            try {
                const response = await fetch(`${apiUrl}/patients`);
                const patients = await response.json();
                const abnormalPatients = patients.filter(isAbnormal);

                alertsContainer.querySelectorAll('.alert-card, .no-alerts').forEach(el => el.remove());

                if (abnormalPatients.length === 0) {
                    const msg = document.createElement('p');
                    msg.className = 'no-alerts';
                    msg.textContent = 'No critical alerts. All patients are stable.';
                    alertsContainer.appendChild(msg);
                } else {
                    abnormalPatients.forEach(patient => {
                        const card = document.createElement('div');
                        card.className = 'alert-card';
                        card.innerHTML = `
                            <h3><i class="fas fa-user-injured"></i> ${patient.name}</h3>
                            <p>Temp: <strong>${patient.temperature}°C</strong> | HR: <strong>${patient.heart_rate} bpm</strong></p>
                            <p>Issue: ${patient.concern}</p>
                            <time>🕒 ${new Date(patient.timestamp).toLocaleString()}</time>
                        `;
                        alertsContainer.appendChild(card);
                    });
                }
            } catch (error) {
                console.error('Error fetching alerts:', error);
                alertsContainer.innerHTML += `<p>Failed to load alert data.</p>`;
            }
        }
        fetchAndDisplayAlerts();
    }
});
