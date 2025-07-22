document.addEventListener('DOMContentLoaded', () => {
    // This is the base URL for your backend API
    const apiUrl = '/api';

    //==================================================================
    // LOGIC FOR ADD PATIENT PAGE (add.html)
    //==================================================================
    const addForm = document.getElementById('add-patient-form');

    if (addForm) {
        addForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop the form from refreshing the page

            const patientData = {
                name: document.getElementById('name').value,
                age: document.getElementById('age').value,
                heartRate: document.getElementById('heartRate').value,
                temperature: document.getElementById('temperature').value,
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
                    window.location.href = 'patients.html'; // Go to the patient list page
                } else {
                    alert('Failed to add patient.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please check the console.');
            }
        });
    }

    //==================================================================
    // LOGIC FOR PATIENT LIST PAGE (patients.html)
    //==================================================================
    const patientTableBody = document.getElementById('patient-table-body');

    if (patientTableBody) {
        async function fetchAndDisplayPatients() {
            try {
                const response = await fetch(`${apiUrl}/patients`);
                const patients = await response.json();

                patientTableBody.innerHTML = ''; // Clear existing table rows

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
                patientTableBody.innerHTML = `<tr><td colspan="6">Failed to load data. Is the server running?</td></tr>`;
            }
        }
        fetchAndDisplayPatients();
    }

    //==================================================================
    // LOGIC FOR ALERTS PAGE (alerts.html)
    //==================================================================
    const alertsContainer = document.getElementById('alerts-container');

    if (alertsContainer) {
        const THRESHOLDS = {
            heartRate: { min: 60, max: 95 },
            temperature: { min: 36.5, max: 40 }
        };

        const isAbnormal = (patient) => {
            // CORRECTED: Uses 'heart_rate' to match the database
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

                const heading = alertsContainer.querySelector('h2');
                alertsContainer.querySelectorAll('.alert-card, .no-alerts').forEach(el => el.remove());

                if (abnormalPatients.length === 0) {
                    const noAlertsMessage = document.createElement('p');
                    noAlertsMessage.className = 'no-alerts';
                    noAlertsMessage.textContent = 'No critical alerts at this time. All patients are stable.';
                    noAlertsMessage.style.textAlign = 'center';
                    alertsContainer.appendChild(noAlertsMessage);
                } else {
                    abnormalPatients.forEach(patient => {
                        const card = document.createElement('div');
                        card.className = 'alert-card';
                        // CORRECTED: Uses 'heart_rate' and 'concern' to match the database
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